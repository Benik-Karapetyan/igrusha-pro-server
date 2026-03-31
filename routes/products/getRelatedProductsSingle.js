const { Product } = require("../../models/product");

const getRelatedProductsSingle = async (req, res) => {
  const product = await Product.findById(req.params.id).populate({
    path: "relatedProducts",
    select: "-__v -cost",
    populate: { path: "categories", select: "-__v" },
    options: { limit: 10 },
  });
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  const existingRelatedProducts = product.relatedProducts.filter(
    (relatedProduct) => relatedProduct.isPublished
  );
  const remainingCount = Math.max(10 - existingRelatedProducts.length, 0);

  let fallbackRelatedProducts = [];

  if (remainingCount > 0) {
    const excludedIds = [
      product._id,
      ...existingRelatedProducts.map((relatedProduct) => relatedProduct._id),
    ];

    const relatedProductsQuery = {
      categories: { $in: product.categories },
      _id: { $nin: excludedIds },
      isVariantOf: { $ne: product._id },
      isPublished: true,
    };

    const productAgeFrom = product.ageRange?.from;
    const productAgeTo = product.ageRange?.to ?? Number.MAX_SAFE_INTEGER;

    if (typeof productAgeFrom === "number") {
      relatedProductsQuery.$expr = {
        $and: [
          { $lte: ["$ageRange.from", productAgeTo] },
          {
            $gte: [
              { $ifNull: ["$ageRange.to", Number.MAX_SAFE_INTEGER] },
              productAgeFrom,
            ],
          },
        ],
      };
    }

    fallbackRelatedProducts = await Product.find(relatedProductsQuery)
      .populate({ path: "categories", select: "-__v" })
      .select("-__v -cost")
      .limit(remainingCount);
  }

  res.send([...existingRelatedProducts, ...fallbackRelatedProducts]);
};

module.exports = getRelatedProductsSingle;
