const mongoose = require("mongoose");
const { Order } = require("../../models/order");

const getOrderById = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })
    .populate({
      path: "items.productId",
      select: "-__v -discount -cost",
    })
    .populate({
      path: "checkoutId",
      select: "-__v",
    });
  if (!order) return res.status(404).send("Order not found.");

  for (const item of order.items) {
    if (item.productId) {
      item.productId.discount = item.discount;
    }
  }

  res.send(order);
};

module.exports = getOrderById;
