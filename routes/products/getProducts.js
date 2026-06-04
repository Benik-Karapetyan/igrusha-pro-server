const { Product } = require("../../models/product");
const { Category } = require("../../models/category");
const omit = require("lodash/omit");

const getProducts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  const search = req.query.search || "";
  const sectionName = req.query.sectionName;
  const categories = req.query.categories;
  const priceMin = req.query.priceMin;
  const priceMax = req.query.priceMax;
  const gender = req.query.gender;
  const ageFrom = req.query.ageFrom;
  const ageTo = req.query.ageTo;
  const hasSection = req.query.hasSection === "true";
  const sortParam =
    typeof req.query.sort === "string" ? req.query.sort.trim() : "";
  const sortTokens = sortParam ? sortParam.split(/\s+/).filter(Boolean) : [];
  if (!sortTokens.length) sortTokens.push("createdAt");
  const hasSortField = (fieldName) =>
    sortTokens.some((token) => token.replace(/^-/, "") === fieldName);
  let shouldSortByAgeAscending = false;

  const query = {
    "name.en": { $regex: search, $options: "i" },
  };

  if (categories) {
    const categoryList = Array.isArray(categories) ? categories : [categories];
    const categoryFilterList = categoryList.filter(
      (category) => category !== "gamesAndToys"
    );

    if (categoryList.includes("gamesAndToys")) {
      const childCategories = await Category.find({
        type: "gamesAndToys",
      }).select("_id");

      categoryFilterList.push(
        ...childCategories.map((category) => category._id.toString())
      );
    }

    query.categories = { $in: [...new Set(categoryFilterList)] };
  } else if (sectionName) {
    query.sectionName = sectionName;
  } else if (hasSection) {
    query.sectionName = { $exists: true, $nin: [null, ""] };
  }

  if (gender) {
    query.gender = { $in: [...new Set([gender, "unisex"])] };
    const shouldPrioritizeRequestedGender = ["boy", "girl"].includes(gender);

    if (shouldPrioritizeRequestedGender) {
      const sortTokensWithoutGender = sortTokens.filter(
        (token) => token.replace(/^-/, "") !== "gender"
      );
      sortTokens.length = 0;
      sortTokens.push("gender", ...sortTokensWithoutGender);
    } else if (!hasSortField("gender")) {
      sortTokens.push("gender");
    }
  }

  if (ageFrom && ageTo) {
    const ageFromNumber = Number(ageFrom);
    const ageToNumber = Number(ageTo);

    if (!Number.isNaN(ageFromNumber) && !Number.isNaN(ageToNumber)) {
      const ageRangeOr = {
        $or: [
          { "ageRange.from": { $gte: ageFromNumber, $lte: ageToNumber } },
          { "ageRange.to": { $gte: ageFromNumber, $lte: ageToNumber } },
        ],
      };
      query.$and = query.$and ? query.$and.concat(ageRangeOr) : [ageRangeOr];
      shouldSortByAgeAscending = true;
    }
  } else if (ageFrom) {
    const ageRangeOr = {
      $or: [
        { "ageRange.from": { $gte: Number(ageFrom) } },
        { "ageRange.to": { $exists: false } },
      ],
    };
    query.$and = query.$and ? query.$and.concat(ageRangeOr) : [ageRangeOr];
    shouldSortByAgeAscending = true;
  }

  if (priceMin && priceMax) {
    query.price = { $gte: priceMin, $lte: priceMax };
  }

  query.isPublished = true;
  query.numberInStock = { $gt: 0 };
  if (shouldSortByAgeAscending) {
    const sortTokensWithoutAge = sortTokens.filter(
      (token) => token.replace(/^-/, "") !== "ageRange.from"
    );
    const createdAtSortIndex = sortTokensWithoutAge.findIndex(
      (token) => token.replace(/^-/, "") === "createdAt"
    );

    sortTokens.length = 0;
    if (createdAtSortIndex === -1) {
      sortTokens.push(...sortTokensWithoutAge, "ageRange.from");
    } else {
      sortTokens.push(
        ...sortTokensWithoutAge.slice(0, createdAtSortIndex),
        "ageRange.from",
        ...sortTokensWithoutAge.slice(createdAtSortIndex)
      );
    }
  }
  if (!hasSortField("_id")) sortTokens.push("_id");
  const sort = sortTokens.join(" ");

  const products = await Product.find(query)
    .populate({ path: "categories", select: "-__v" })
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .select("-__v -cost");
  const totalRecords = await Product.countDocuments(query);
  const priceStats = await Product.aggregate([
    { $match: omit(query, "price", "categories") },
    {
      $group: {
        _id: null,
        maxPrice: { $max: "$price" },
      },
    },
  ]);
  const maxPrice = priceStats[0]?.maxPrice || null;

  res.send({
    items: products,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
    maxPrice,
  });
};

module.exports = getProducts;
