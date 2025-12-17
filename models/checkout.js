const Joi = require("joi");
const mongoose = require("mongoose");

const checkoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "abandoned", "completed"],
    default: "active",
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null,
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
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

checkoutSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Checkout = mongoose.model("Checkout", checkoutSchema);

const validateCheckout = (checkout) => {
  const schema = Joi.object({
    userId: Joi.objectId().required(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.objectId().required(),
          quantity: Joi.number().integer().min(1).required(),
        })
      )
      .required(),
  });

  return schema.validate(checkout);
};

const validateCheckoutQuantityChange = (quantity) => {
  const schema = Joi.object({
    productId: Joi.objectId().required(),
    quantity: Joi.number().integer().min(1).required(),
  });

  return schema.validate(quantity);
};

module.exports = {
  Checkout,
  validate: validateCheckout,
  validateCheckoutQuantityChange,
};
