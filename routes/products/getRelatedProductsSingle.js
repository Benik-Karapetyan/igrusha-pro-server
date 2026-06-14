const { Product } = require("../../models/product");

const buildFallbackQuery = (product, excludedIds, includeBrand) => {
  const relatedProductsQuery = {
    categories: { $in: product.categories },
    _id: { $nin: excludedIds },
    isVariantOf: { $ne: product._id },
    isPublished: true,
  };

  if (includeBrand && product.brand) {
    relatedProductsQuery.brand = product.brand;
  }

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

  return relatedProductsQuery;
};

const findFallbackRelatedProducts = (query, limit) =>
  Product.find(query)
    .populate({ path: "categories", select: "-__v" })
    .select("-__v -cost")
    .limit(limit);

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
  let remainingCount = Math.max(10 - existingRelatedProducts.length, 0);

  const fallbackRelatedProducts = [];

  if (remainingCount > 0) {
    let excludedIds = [
      product._id,
      ...existingRelatedProducts.map((relatedProduct) => relatedProduct._id),
    ];

    if (product.brand) {
      const byBrandAndCategory = await findFallbackRelatedProducts(
        buildFallbackQuery(product, excludedIds, true),
        remainingCount
      );
      fallbackRelatedProducts.push(...byBrandAndCategory);
      excludedIds.push(...byBrandAndCategory.map((p) => p._id));
      remainingCount -= byBrandAndCategory.length;
    }

    if (remainingCount > 0) {
      const byCategory = await findFallbackRelatedProducts(
        buildFallbackQuery(product, excludedIds, false),
        remainingCount
      );
      fallbackRelatedProducts.push(...byCategory);
    }
  }

  res.send([...existingRelatedProducts, ...fallbackRelatedProducts]);
};

module.exports = getRelatedProductsSingle;
