const Joi = require("joi");
const mongoose = require("mongoose");

const BrandSchema = new mongoose.Schema({
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
  name: {
    type: Object,
    required: true,
    properties: {
      am: { type: String, required: true },
      ru: { type: String, required: true },
      en: { type: String, required: true },
    },
  },
  title: {
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
  isPublished: { type: Boolean, default: false },
});

const Brand = mongoose.model("Brand", BrandSchema);

const validateBrand = (brand) => {
  const schema = Joi.object({
    urlName: Joi.string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .required(),
    name: Joi.object({
      am: Joi.string().min(1).required(),
      ru: Joi.string().min(1).required(),
      en: Joi.string().min(1).required(),
    }).required(),
    title: Joi.object({
      am: Joi.string().min(1).required(),
      ru: Joi.string().min(1).required(),
      en: Joi.string().min(1).required(),
    }).required(),
    description: Joi.object({
      am: Joi.string().min(1).required(),
      ru: Joi.string().min(1).required(),
      en: Joi.string().min(1).required(),
    }).required(),
    isPublished: Joi.boolean(),
  });

  return schema.validate(brand);
};

module.exports = {
  Brand,
  BrandSchema,
  validate: validateBrand,
};
