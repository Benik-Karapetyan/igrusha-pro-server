const { Product } = require("../../models/product");

const getProductByUrlName = async (req, res) => {
  let product = await Product.findOne({ urlName: req.params.urlName })
    .populate({ path: "categories", select: "-__v" })
    .select("-__v -cost");
  if (!product)
    return res
      .status(404)
      .send("The product with the given URL name was not found.");

  if (product.isVariantOf) {
    product = await Product.findById(product.isVariantOf)
      .populate({ path: "categories", select: "-__v" })
      .populate({
        path: "variants",
        select: "-__v -cost",
        populate: { path: "categories", select: "-__v" },
      })
      .select("-__v -cost");
  }

  res.send(product);
};

module.exports = getProductByUrlName;
