const Joi = require("joi");
const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  type: {
    type: [String],
    enum: ["gamesAndToys", "baby", "boy", "girl", "forHappiestDays"],
    required: true,
  },
  // image: {
  //   type: String,
  //   required: true,
  //   validate: {
  //     validator: (v) => typeof v === "string" && v.length > 0,
  //     message: "Image must be a valid URL",
  //   },
  // },
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

const Category = mongoose.model("Category", CategorySchema);

const validateCategory = (category) => {
  const schema = Joi.object({
    type: Joi.array()
      .items(
        Joi.string().valid(
          "gamesAndToys",
          "baby",
          "boy",
          "girl",
          "forHappiestDays"
        )
      )
      .min(1)
      .required(),
    image: Joi.string().required(),
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

  return schema.validate(category);
};

module.exports = {
  Category,
  CategorySchema,
  validate: validateCategory,
};
