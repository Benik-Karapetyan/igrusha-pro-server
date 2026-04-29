const { Product } = require("../../models/product");

const getProductMeta = async (req, res) => {
  let product = await Product.findOne(
    { urlName: req.params.urlName },
    { name: 1, description: 1, gallery: { $slice: 1 } }
  );
  if (!product)
    return res
      .status(404)
      .send("The product with the given URL name was not found.");

  res.send(product);
};

module.exports = getProductMeta;
