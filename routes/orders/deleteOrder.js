const mongoose = require("mongoose");
const { Order } = require("../../models/order");
const { Product } = require("../../models/product");
const { Sale } = require("../../models/sale");
const { Checkout } = require("../../models/checkout");

const deleteOrder = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).send("Order not found.");

  const statusesNeedingStockReturn = ["onTheWay", "delivered", "returnPending"];
  const shouldReturnStock = statusesNeedingStockReturn.includes(order.status);

  if (shouldReturnStock) {
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

        if (order.checkoutId) {
          await Checkout.deleteOne({ _id: order.checkoutId }, { session });
        }

        await Order.deleteOne({ _id: order._id }, { session });
      });

      await session.endSession();
      res.sendStatus(204);
    } catch (err) {
      await session.endSession();
      throw err;
    }
  } else {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await Sale.deleteMany(
          { orderId: order._id, source: "order" },
          { session }
        );

        if (order.checkoutId) {
          await Checkout.deleteOne({ _id: order.checkoutId }, { session });
        }

        await Order.deleteOne({ _id: order._id }, { session });
      });

      await session.endSession();
      res.sendStatus(204);
    } catch (err) {
      await session.endSession();
      throw err;
    }
  }
};

module.exports = deleteOrder;
