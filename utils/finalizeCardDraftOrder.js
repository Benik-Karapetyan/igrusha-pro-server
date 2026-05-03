const mongoose = require("mongoose");
const { Order } = require("../models/order");
const { Checkout } = require("../models/checkout");
const winston = require("winston");

/**
 * Moves a paid card draft to onTheWay and marks checkout completed (same as completeOrderPayment).
 * @returns {Promise<boolean>} true if order and checkout were updated
 */
async function finalizeCardDraftOrder(orderId) {
  const session = await mongoose.startSession();
  let didFinalize = false;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order || order.status !== "draft" || !order.payment?.isPaid) {
        return;
      }
      if (order.paymentMethod !== "card") {
        return;
      }
      if (!order.checkoutId) {
        winston.warn(
          `Draft paid order ${order._id} has no checkoutId; skipping finalize`
        );
        return;
      }
      const checkout = await Checkout.findById(order.checkoutId).session(
        session
      );
      if (!checkout) {
        winston.warn(
          `Draft paid order ${order._id}: checkout ${order.checkoutId} not found; skipping finalize`
        );
        return;
      }
      order.status = "onTheWay";
      checkout.status = "completed";
      await order.save({ session });
      await checkout.save({ session });
      didFinalize = true;
    });
  } catch (error) {
    winston.error(`Error finalizing paid draft order ${orderId}:`, error);
  } finally {
    await session.endSession();
  }
  return didFinalize;
}

module.exports = finalizeCardDraftOrder;
