const router = require("express").Router();
const { Product } = require("../models/product");
const { User } = require("../models/user");
const auth = require("../middleware/auth");
const Joi = require("joi");

const validateProductIds = (productIds) => {
  const schema = Joi.array().items(Joi.objectId()).min(1).required();
  return schema.validate(productIds);
};

router.get("/", async (req, res) => {
  let productIds = req.query.productIds;

  if (typeof productIds === "string") {
    productIds = productIds.split(",").map((id) => id.trim());
  } else if (Array.isArray(productIds)) {
    productIds = productIds;
  } else {
    return res.status(400).send("productIds parameter is required");
  }

  const { error } = validateProductIds(productIds);
  if (error) return res.status(400).send(error.message);

  const products = await Product.find({
    _id: { $in: productIds },
  })
    .populate({ path: "relatedProducts", select: "-__v -cost" })
    .select("-__v -cost");

  res.send(products);
});

router.post("/:userId", auth, async (req, res) => {
  const { productIds } = req.body;

  if (!productIds) return res.status(400).send("productIds is required");
  if (!Array.isArray(productIds))
    return res.status(400).send("productIds must be an array");

  const { error } = validateProductIds(productIds);
  if (error) return res.status(400).send(error.message);

  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    return res.status(404).send("One or more products not found.");
  }

  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { $addToSet: { favorites: { $each: productIds } } },
    { new: true }
  );

  if (!user) return res.status(404).send("User not found.");

  res.send(user);
});

module.exports = router;
