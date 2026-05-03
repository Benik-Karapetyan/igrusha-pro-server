const mongoose = require("mongoose");
const { Order } = require("../../models/order");
const { Checkout } = require("../../models/checkout");
const finalizeCardDraftOrder = require("../../utils/finalizeCardDraftOrder");

const completeOrderPayment = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!order) return res.status(404).send("Order not found.");

  if (order.paymentMethod !== "card") {
    return res
      .status(400)
      .send("Payment completion is supported only for card orders.");
  }

  if (order.status !== "draft")
    return res.status(400).send("Order is not in draft status.");

  if (!order.payment?.isPaid) {
    return res.status(409).send("Order payment is not confirmed yet.");
  }

  const checkout = order.checkoutId
    ? await Checkout.findOne({ _id: order.checkoutId })
    : null;
  if (!checkout) return res.status(404).send("Checkout not found.");

  const didFinalize = await finalizeCardDraftOrder(order._id);
  if (!didFinalize) {
    return res.status(409).send("Order could not be completed.");
  }

  const updated = await Order.findById(order._id);
  await updated.populate({
    path: "items.productId",
    select: "-__v -cost",
  });

  res.send(updated);
};

module.exports = completeOrderPayment;
