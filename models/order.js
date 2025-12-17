const Joi = require("joi");
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  checkoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Checkout",
    required: true,
  },
  status: {
    type: String,
    enum: ["onTheWay", "delivered", "cancelled", "returned"],
    required: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deliveredAt: {
    type: Date,
  },
});

const Order = mongoose.model("Order", orderSchema);

const validateOrder = (order) => {
  const schema = Joi.object({
    userId: Joi.objectId().required(),
    checkoutId: Joi.objectId().required(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.objectId().required(),
          quantity: Joi.number().integer().min(1).required(),
        })
      )
      .required(),
  });

  return schema.validate(order);
};

module.exports = {
  Order,
  validate: validateOrder,
};
