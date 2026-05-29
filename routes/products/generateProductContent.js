const Joi = require("joi");
const mongoose = require("mongoose");
const config = require("config");
const { Product } = require("../../models/product");
const generateProductContentFromImage = require("../../utils/gemini/generateProductContentFromImage");

const textByLocaleSchema = Joi.object({
  am: Joi.string().required(),
  ru: Joi.string().required(),
  en: Joi.string().required(),
});

const optionalTextByLocaleSchema = Joi.object({
  am: Joi.string().allow("").required(),
  ru: Joi.string().allow("").required(),
  en: Joi.string().allow("").required(),
});

const responseSchema = Joi.object({
  name: textByLocaleSchema.required(),
  description: textByLocaleSchema.required(),
  keyFeatures: Joi.array()
    .items(
      Joi.object({
        label: textByLocaleSchema.required(),
        value: textByLocaleSchema.required(),
      })
    )
    .required(),
  whatsIncluded: Joi.array().items(textByLocaleSchema).required(),
  material: optionalTextByLocaleSchema.required(),
  poweredBy: optionalTextByLocaleSchema.required(),
  size: Joi.object({
    length: Joi.number().min(0).optional(),
    width: Joi.number().min(0).optional(),
    height: Joi.number().min(0).optional(),
  }).required(),
});

const resolveFirstGalleryImageUrl = (gallery) => {
  const firstImage = gallery[0];
  if (/^https?:\/\//i.test(firstImage)) return firstImage;

  return `https://${config.get("s3BucketName")}.s3.${config.get(
    "awsRegion"
  )}.amazonaws.com/${firstImage}`;
};

const generateProductContent = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send("Invalid product ID.");
  }

  const product = await Product.findById(req.params.id)
    .select("gallery name brand gender ageRange sectionName categories")
    .populate("categories", "name");
  if (!product) {
    return res.status(404).send("The product with the given ID was not found.");
  }

  if (!product.gallery?.length) {
    return res
      .status(400)
      .send("Product gallery must contain at least one image.");
  }

  try {
    const imageUrl = resolveFirstGalleryImageUrl(product.gallery);
    const generated = await generateProductContentFromImage(imageUrl, {
      name: product.name,
      brand: product.brand,
      gender: product.gender,
      ageRange: product.ageRange,
      sectionName: product.sectionName,
      categories: product.categories,
    });
    const { error: responseError, value } = responseSchema.validate(generated);

    if (responseError) {
      return res
        .status(502)
        .send(`Gemini response validation failed: ${responseError.message}`);
    }

    res.send(value);
  } catch (err) {
    res.status(500).send(err.message || "Failed to generate product content.");
  }
};

module.exports = generateProductContent;
