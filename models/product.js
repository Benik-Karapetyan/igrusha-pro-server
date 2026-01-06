const Joi = require("joi");
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productNumber: {
    type: String,
    unique: true,
  },
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
  initialNumberInStock: { type: Number, required: true, min: 0 },
  numberInStock: { type: Number, required: true, min: 0 },
  gender: {
    type: String,
    enum: ["unisex", "boy", "girl"],
    required: true,
  },
  ageRange: {
    type: Object,
    required: true,
    properties: {
      from: { type: Number, required: true, min: 0 },
      to: { type: Number, required: false, min: 0 },
    },
  },
  size: {
    type: Object,
    required: true,
    properties: {
      width: { type: Number, required: true, min: 0 },
      height: { type: Number, required: true, min: 0 },
      height: { type: Number, required: true, min: 0 },
    },
  },
  boxSize: {
    type: Object,
    required: false,
    properties: {
      length: { type: Number, required: false, min: 0 },
      width: { type: Number, required: false, min: 0 },
      height: { type: Number, required: false, min: 0 },
    },
  },
  brand: {
    type: String,
    required: false,
  },
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

productSchema.pre("save", async function (next) {
  if (!this.productNumber && this.isNew) {
    const genderMap = {
      unisex: "01",
      boy: "02",
      girl: "03",
    };
    const genderCode = genderMap[this.gender] || "01";

    const ageMin = this.ageRange?.from || 0;
    const ageMax = this.ageRange?.to || 0;
    const ageRangeMin = String(ageMin);
    const ageRangeMax = String(ageMax);

    const ProductModel = mongoose.model("Product");
    const productsCount = await ProductModel.countDocuments();
    const sequentialNumber = String(productsCount + 1).padStart(4, "0");

    this.productNumber = `${genderCode}${ageRangeMin}${ageRangeMax}-${sequentialNumber}`;
  }

  this.updatedAt = Date.now();
  next();
});

const Product = mongoose.model("Product", productSchema);

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
    gender: Joi.string().valid("unisex", "boy", "girl").required(),
    ageRange: Joi.object({
      from: Joi.number().min(0).required(),
      to: Joi.number().min(0).optional(),
    }).required(),
    size: Joi.object({
      length: Joi.number().min(0).required(),
      width: Joi.number().min(0).required(),
      height: Joi.number().min(0).required(),
    }).required(),
    boxSize: Joi.object({
      length: Joi.number().min(0).optional(),
      width: Joi.number().min(0).optional(),
      height: Joi.number().min(0).optional(),
    }).optional(),
    brand: Joi.string().allow("").optional(),
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
