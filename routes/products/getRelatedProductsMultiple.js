const mongoose = require("mongoose");
const { Product } = require("../../models/product");

const getRelatedProductsMultiple = async (req, res) => {
  const idsParam = req.query.ids;
  if (!idsParam)
    return res.status(400).send("Query parameter ids is required.");

  const ids = (
    Array.isArray(idsParam) ? idsParam : idsParam.toString().split(",")
  )
    .map((id) => id.toString().trim())
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
  if (!ids.length)
    return res.status(400).send("No valid product IDs were provided.");

  const sourceProducts = await Product.find({
    _id: { $in: ids },
    isPublished: true,
  }).select("categories ageRange");
  if (!sourceProducts || sourceProducts.length === 0)
    return res
      .status(404)
      .send("The products with the given IDs were not found.");

  const categoryIds = [
    ...new Set(
      sourceProducts.flatMap((product) =>
        (product.categories || []).map((categoryId) => categoryId.toString())
      )
    ),
  ];

  const ageRanges = sourceProducts
    .map((product) => ({
      from: product.ageRange?.from,
      to: product.ageRange?.to ?? Number.MAX_SAFE_INTEGER,
    }))
    .filter((range) => typeof range.from === "number");

  const relatedQuery = {
    _id: { $nin: ids },
    isPublished: true,
    categories: { $in: categoryIds },
  };

  if (ageRanges.length) {
    relatedQuery.$or = ageRanges.map((range) => ({
      $expr: {
        $and: [
          { $lte: ["$ageRange.from", range.to] },
          {
            $gte: [
              { $ifNull: ["$ageRange.to", Number.MAX_SAFE_INTEGER] },
              range.from,
            ],
          },
        ],
      },
    }));
  }

  const products = await Product.find(relatedQuery)
    .populate({ path: "categories", select: "-__v" })
    .select("-__v -cost")
    .limit(10);

  res.send(products);
};

module.exports = getRelatedProductsMultiple;
