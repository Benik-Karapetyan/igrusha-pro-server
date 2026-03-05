const Joi = require("joi");
const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema({
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
  source: {
    type: String,
    enum: ["manual", "order"],
    default: "manual",
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  note: {
    type: String,
    max: 1024,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Sale = mongoose.model("Sale", SaleSchema);

const validateSale = (sale) => {
  const schema = Joi.object({
    productId: Joi.objectId().required(),
    quantity: Joi.number().integer().min(1).required(),
    source: Joi.string().valid("manual", "order").optional(),
    orderId: Joi.objectId().optional(),
    note: Joi.string().max(1024).allow("").optional(),
    createdAt: Joi.date().optional(),
  });

  return schema.validate(sale);
};

module.exports = { Sale, validate: validateSale };
