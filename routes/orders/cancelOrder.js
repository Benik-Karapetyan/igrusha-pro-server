const mongoose = require("mongoose");
const { Order, validateReason } = require("../../models/order");
const { Product } = require("../../models/product");
const { Sale } = require("../../models/sale");

const cancelOrder = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!order) return res.status(404).send("Order not found.");

  const { error } = validateReason(req.body);
  if (error) return res.status(400).send(error.message);

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

  const session = await mongoose.startSession();

  try {
    order.status = "cancelled";
    order.cancellationReason = req.body.reason;

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
    res.send(order);
  } catch (err) {
    await session.endSession();
    throw err;
  }
};

module.exports = cancelOrder;
