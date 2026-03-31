const { Product } = require("../../models/product");

const publishProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  product.isPublished = req.body.isPublished;
  await product.save();

  res.send(product);
};

module.exports = publishProduct;
