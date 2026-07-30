const Joi = require("joi");
const mongoose = require("mongoose");

const ProcurementProductSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true,
    validate: {
      validator: (v) => typeof v === "string" && v.length > 0,
      message: "Image must be a valid URL",
    },
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: (v) => {
        try {
          const parsed = new URL(v);
          return parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      message: "URL must be a valid HTTPS address",
    },
  },
  price: { type: Number, required: true, min: 1 },
  cartonQuantity: { type: Number, required: false, min: 0 },
  cartonWeight: { type: Number, required: false, min: 0 },
  cartonSize: {
    type: Object,
    required: false,
    properties: {
      length: { type: Number, required: false, min: 0 },
      width: { type: Number, required: false, min: 0 },
      height: { type: Number, required: false, min: 0 },
    },
  },
  quantity: { type: Number, required: false, min: 0 },
  deliveryInsideCost: { type: Number, required: false, min: 0 },
  deliveryInsideDuration: { type: String, required: false },
  paymentFee: { type: Number, required: false, min: 0 },
  brand: { type: String, required: false },
  seller: { type: String, required: false },
  isOrdered: { type: Boolean, required: false },
  createdAt: { type: Date, default: Date.now },
});

const ProcurementProduct = mongoose.model(
  "ProcurementProduct",
  ProcurementProductSchema
);

const validateProcurementProduct = (procurementProduct) => {
  const schema = Joi.object({
    image: Joi.string().required(),
    url: Joi.string()
      .uri({ scheme: ["https"] })
      .required(),
    price: Joi.number().min(1).required(),
    cartonQuantity: Joi.number().min(0).optional(),
    cartonWeight: Joi.number().min(0).optional(),
    cartonSize: Joi.object({
      length: Joi.number().min(0).optional(),
      width: Joi.number().min(0).optional(),
      height: Joi.number().min(0).optional(),
    }).required(),
    quantity: Joi.number().min(0).optional(),
    deliveryInsideCost: Joi.number().min(0).optional(),
    deliveryInsideDuration: Joi.string().optional(),
    paymentFee: Joi.number().min(0).optional(),
    brand: Joi.string().allow("").optional(),
    seller: Joi.string().allow("").optional(),
    isOrdered: Joi.boolean().optional(),
    createdAt: Joi.date().optional(),
  });

  return schema.validate(procurementProduct);
};

module.exports = { ProcurementProduct, validate: validateProcurementProduct };
