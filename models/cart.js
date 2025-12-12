const Joi = require("joi");
const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
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
      selected: {
        type: Boolean,
        required: true,
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

cartSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Cart = mongoose.model("Cart", cartSchema);

const validateCartItem = (item) => {
  const schema = Joi.object({
    productId: Joi.objectId().required(),
    quantity: Joi.number().integer().min(1).required(),
    selected: Joi.boolean().required(),
  });

  return schema.validate(item);
};

const validateCartItems = (items) => {
  const schema = Joi.array().items(
    Joi.object({
      productId: Joi.objectId().required(),
      quantity: Joi.number().integer().min(1).required(),
      selected: Joi.boolean().required(),
    })
  );

  return schema.validate(items);
};

module.exports = {
  Cart,
  validateCartItem,
  validateCartItems,
};
