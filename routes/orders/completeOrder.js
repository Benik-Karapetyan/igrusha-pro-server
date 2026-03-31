const mongoose = require("mongoose");
const { Order } = require("../../models/order");

const completeOrder = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
  });
  if (!order) return res.status(404).send("Order not found.");

  order.status = "delivered";
  order.deliveredAt = Date.now();
  await order.save();

  res.send(order);
};

module.exports = completeOrder;
