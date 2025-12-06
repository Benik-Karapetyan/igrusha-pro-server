const Joi = require("joi");
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  gallery: {
    type: [String],
    required: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: "Gallery must contain at least one image",
    },
  },
  name: {
    type: Object,
    required: true,
    properties: {
      am: { type: String, required: true },
      ru: { type: String, required: true },
      en: { type: String, required: true },
    },
  },
  description: {
    type: Object,
    required: true,
    properties: {
      am: { type: String, required: true },
      ru: { type: String, required: true },
      en: { type: String, required: true },
    },
  },
  price: { type: Number, required: true, min: 1 },
  discount: { type: Number, required: true, min: 0, max: 99 },
  numberInStock: { type: Number, required: true, min: 0 },
  rating: { type: Number, required: true, min: 0, max: 5 },
  reviewCount: { type: Number, required: true, min: 0 },
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  variants: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Product",
    default: [],
  },
  isVariantOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  sectionName: { type: String, required: true },
  relatedProducts: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Product",
    default: [],
  },
});

const Product = mongoose.model("Product", productSchema);

productSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const validateProduct = (product) => {
  const schema = Joi.object({
    gallery: Joi.array().items(Joi.string()).min(1).required(),
    name: Joi.object({
      am: Joi.string().min(1).required(),
      ru: Joi.string().min(1).required(),
      en: Joi.string().min(1).required(),
    }).required(),
    description: Joi.object({
      am: Joi.string().min(1).required(),
      ru: Joi.string().min(1).required(),
      en: Joi.string().min(1).required(),
    }).required(),
    price: Joi.number().min(1).required(),
    discount: Joi.number().min(0).max(99).required(),
    numberInStock: Joi.number().min(0).required(),
    rating: Joi.number().min(0).max(5).required(),
    reviewCount: Joi.number().min(0).required(),
    isPublished: Joi.boolean(),
    createdAt: Joi.date().optional(),
    variants: Joi.array().items(Joi.objectId()).default([]),
    isVariantOf: Joi.objectId().allow("").optional(),
    sectionName: Joi.string().min(1).required(),
    relatedProducts: Joi.array().items(Joi.objectId()).default([]),
  });

  return schema.validate(product);
};

module.exports = { Product, validate: validateProduct };
