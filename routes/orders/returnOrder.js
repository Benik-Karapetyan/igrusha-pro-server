const mongoose = require("mongoose");
const { Order, validateReason } = require("../../models/order");

const returnOrder = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!order) return res.status(404).send("Order not found.");

  const orderReturnExpiry = new Date(
    new Date(order.createdAt).getTime() + 2 * 24 * 60 * 60 * 1000
  );
  if (new Date() > orderReturnExpiry)
    return res
      .status(400)
      .send(
        "Return period has expired. Returns are only allowed within 2 days of delivering the order."
      );

  const { error } = validateReason(req.body);
  if (error) return res.status(400).send(error.message);

  order.status = "returnPending";
  order.returnReason = req.body.reason;
  await order.save();

  res.send(order);
};

module.exports = returnOrder;
