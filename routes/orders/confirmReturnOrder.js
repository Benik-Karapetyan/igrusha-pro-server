const mongoose = require("mongoose");
const { Order } = require("../../models/order");
const { Product } = require("../../models/product");
const { Sale } = require("../../models/sale");
const refundPaidCardOrder = require("./refundPaidCardOrder");

const confirmReturnOrder = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    status: "returnPending",
  });
  if (!order) return res.status(404).send("Order not found.");

  const productIds = order.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    return res.status(404).send("One or more products not found.");
  }

  const quantityByProductId = {};
  for (const item of order.items) {
    const key = item.productId.toString();
    quantityByProductId[key] = item.quantity;
  }

  const wasCardPaid =
    order.paymentMethod === "card" && order.payment?.isPaid === true;

  const refundResult = await refundPaidCardOrder(order);
  if (!refundResult.ok) {
    if (refundResult.body) {
      return res.status(refundResult.status).send(refundResult.body);
    }
    return res.status(refundResult.status).send(refundResult.message);
  }

  if (wasCardPaid) {
    order.payment.isPaid = false;
    order.payment.isPaymentRefunded = true;
    order.payment.paidAt = null;
  }

  const session = await mongoose.startSession();

  try {
    order.status = "returned";
    order.returnedAt = Date.now();

    await session.withTransaction(async () => {
      for (const product of products) {
        const quantity = quantityByProductId[product._id.toString()];
        product.numberInStock += quantity;
        product.soldCount = Math.max(0, (product.soldCount || 0) - quantity);
        await product.save({ session });
      }
      await Sale.deleteMany(
        { orderId: order._id, source: "order" },
        { session }
      );

      await order.save({ session });
    });

    await session.endSession();
    res.sendStatus(204);
  } catch (err) {
    await session.endSession();
    throw err;
  }
};

module.exports = confirmReturnOrder;
