const mongoose = require("mongoose");
const { Order } = require("../../models/order");
const syncOrderPaymentFromGateway = require("../../utils/syncOrderPaymentFromGateway");

const getOrderPaymentStatus = async (req, res) => {
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
      .send("Payment gateway status is supported only for card orders.");
  }

  const result = await syncOrderPaymentFromGateway(order);
  if (!result.ok) {
    return res.status(502).send({
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });
  }

  res.send({
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    amount: result.amount,
    isPaid: result.isPaid,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  });
};

module.exports = getOrderPaymentStatus;
