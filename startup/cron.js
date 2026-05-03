const cron = require("node-cron");
const mongoose = require("mongoose");
const { Checkout } = require("../models/checkout");
const { Order } = require("../models/order");
const { Product } = require("../models/product");
const { Sale } = require("../models/sale");
const syncOrderPaymentFromGateway = require("../utils/syncOrderPaymentFromGateway");
const finalizeCardDraftOrder = require("../utils/finalizeCardDraftOrder");
const winston = require("winston");

const PAYMENT_REGISTRATION_TTL_MS = 20 * 60 * 1000;

module.exports = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const result = await Checkout.updateMany(
        {
          status: "active",
          createdAt: { $lt: twentyFourHoursAgo },
        },
        {
          $set: { status: "abandoned" },
        }
      );

      if (result.modifiedCount > 0) {
        winston.info(`Marked ${result.modifiedCount} checkout(s) as abandoned`);
      }
    } catch (error) {
      winston.error("Error in abandoned checkout cron job:", error);
    }
  });

  cron.schedule("*/5 * * * *", async () => {
    try {
      const registrationDeadline = new Date(
        Date.now() - PAYMENT_REGISTRATION_TTL_MS
      );

      const draftIds = await Order.find({ status: "draft" }).distinct("_id");

      let finalizedPaid = 0;
      let cancelledDrafts = 0;
      let syncFailures = 0;

      for (const orderId of draftIds) {
        const order = await Order.findById(orderId);
        if (!order || order.status !== "draft") continue;

        if (order.paymentMethod === "card") {
          const syncResult = await syncOrderPaymentFromGateway(order);
          if (!syncResult.ok) {
            syncFailures += 1;
            winston.warn(
              `Draft order ${orderId}: gateway sync failed (errorCode=${syncResult.errorCode}); skipping finalize and expiry cancel this run`
            );
            continue;
          }

          if (order.payment?.isPaid) {
            if (await finalizeCardDraftOrder(orderId)) finalizedPaid += 1;
            continue;
          }
        }

        if (order.payment?.isPaid === true) continue;

        const regAt = order.payment?.registeredAt;
        if (
          !regAt ||
          !(regAt instanceof Date) ||
          regAt > registrationDeadline
        ) {
          continue;
        }

        const session = await mongoose.startSession();
        let didCancel = false;
        try {
          await session.withTransaction(async () => {
            const orderDoc = await Order.findById(orderId).session(session);
            if (!orderDoc || orderDoc.status !== "draft") return;
            if (orderDoc.payment?.isPaid === true) return;
            const reg = orderDoc.payment?.registeredAt;
            if (
              !reg ||
              !(reg instanceof Date) ||
              reg > registrationDeadline
            ) {
              return;
            }

            const productIds = orderDoc.items.map((item) => item.productId);
            const products = await Product.find({
              _id: { $in: productIds },
            }).session(session);
            if (products.length !== productIds.length) {
              winston.warn(
                `Expired draft order ${orderDoc._id}: one or more products missing; skipping stock revert`
              );
              return;
            }

            const quantityByProductId = {};
            for (const item of orderDoc.items) {
              quantityByProductId[item.productId.toString()] = item.quantity;
            }

            for (const product of products) {
              const quantity = quantityByProductId[product._id.toString()];
              product.numberInStock += quantity;
              product.soldCount = Math.max(
                0,
                (product.soldCount || 0) - quantity
              );
              await product.save({ session });
            }

            await Sale.deleteMany(
              { orderId: orderDoc._id, source: "order" },
              { session }
            );

            orderDoc.status = "draftCancelled";
            await orderDoc.save({ session });

            if (orderDoc.checkoutId) {
              const checkout = await Checkout.findById(
                orderDoc.checkoutId
              ).session(session);
              if (checkout) {
                checkout.status = "abandoned";
                await checkout.save({ session });
              }
            }

            didCancel = true;
          });
          if (didCancel) cancelledDrafts += 1;
        } catch (error) {
          winston.error(
            `Error cancelling expired draft order ${orderId}:`,
            error
          );
        } finally {
          await session.endSession();
        }
      }

      winston.info(
        `Draft order cron: drafts=${draftIds.length}; gateway sync failures=${syncFailures}; paid→onTheWay=${finalizedPaid}; unpaid stale registration→draftCancelled=${cancelledDrafts}`
      );
    } catch (error) {
      winston.error("Error in draft order maintenance cron job:", error);
    }
  });

  winston.info("Cron job for abandoned checkouts is scheduled");
  winston.info(
    "Cron job for draft orders is scheduled every 5 minutes at :00, :05, … (server local time) — see log line each run"
  );
};
