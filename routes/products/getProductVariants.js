const { Product } = require("../../models/product");

const getProductVariants = async (req, res) => {
  const product = await Product.findById(req.params.id).populate({
    path: "variants",
    match: { isPublished: true },
    select: "-__v -cost",
    populate: { path: "categories", select: "-__v" },
  });
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  res.send(product.variants);
};

module.exports = getProductVariants;
