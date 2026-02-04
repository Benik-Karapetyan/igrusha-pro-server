const Joi = require("joi");
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
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
  urlName: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v),
      message:
        "URL name must contain only lowercase letters, numbers, and hyphens",
    },
  },
  categories: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Category",
    required: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: "Categories must contain at least one category",
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
  cost: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 1 },
  discount: { type: Number, required: true, min: 0, max: 99 },
  numberInStock: { type: Number, required: true, min: 0 },
  sectionName: { type: String },
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
    required: false,
    properties: {
      width: { type: Number, required: false, min: 0 },
      height: { type: Number, required: false, min: 0 },
      height: { type: Number, required: false, min: 0 },
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
  relatedProducts: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Product",
    default: [],
  },
});

ProductSchema.pre("save", async function (next) {
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

const Product = mongoose.model("Product", ProductSchema);

const validateProduct = (product) => {
  const schema = Joi.object({
    gallery: Joi.array().items(Joi.string()).min(1).required(),
    urlName: Joi.string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .required(),
    categories: Joi.array().items(Joi.objectId()).min(1).required(),
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
    cost: Joi.number().min(1).required(),
    price: Joi.number().min(1).required(),
    discount: Joi.number().min(0).max(99).required(),
    numberInStock: Joi.number().min(0).required(),
    sectionName: Joi.string().allow(""),
    gender: Joi.string().valid("unisex", "boy", "girl").required(),
    ageRange: Joi.object({
      from: Joi.number().min(0).required(),
      to: Joi.number().min(0).optional(),
    }).required(),
    size: Joi.object({
      length: Joi.number().min(0).optional(),
      width: Joi.number().min(0).optional(),
      height: Joi.number().min(0).optional(),
    }).optional(),
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
    relatedProducts: Joi.array().items(Joi.objectId()).default([]),
  });

  return schema.validate(product);
};

module.exports = { Product, validate: validateProduct };
