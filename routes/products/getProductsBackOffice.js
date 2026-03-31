const { Product } = require("../../models/product");

const getProductsBackOffice = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 25;
  const skip = (page - 1) * pageSize;
  const search = req.query.search || "";
  const sectionName = req.query.sectionName;
  const sort = req.query.sort || "-createdAt";
  const includeIsVariantOf = req.query.includeIsVariantOf === "true";

  const query = {
    "name.en": { $regex: search, $options: "i" },
    $or: includeIsVariantOf
      ? []
      : [{ isVariantOf: null }, { isVariantOf: { $exists: false } }],
  };

  if (sectionName) {
    query.sectionName = sectionName;
  }

  const products = await Product.find(query)
    .populate({ path: "categories", select: "-__v" })
    .populate({ path: "relatedProducts", select: "-__v" })
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .select("-__v");
  const totalRecords = await Product.countDocuments(query);

  res.send({
    items: products,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
};

module.exports = getProductsBackOffice;
