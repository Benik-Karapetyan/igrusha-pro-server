const { Product } = require("../../models/product");

const getProductById = async (req, res) => {
  let product = await Product.findById(req.params.id)
    .populate({ path: "categories", select: "-__v" })
    .select("-__v -cost");
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  res.send(product);
};

module.exports = getProductById;
