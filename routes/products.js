const config = require("config");
const router = require("express").Router();
const mongoose = require("mongoose");
const { Product, validate } = require("../models/product");
const { Entry } = require("../models/entry");
const { Sale } = require("../models/sale");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const omit = require("lodash/omit");

router.get("/", async (req, res) => {
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

  const query = {
    "name.en": { $regex: search, $options: "i" },
  };

  if (categories) {
    const categoryList = Array.isArray(categories) ? categories : [categories];

    query.categories = { $in: categoryList };
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
    }
  } else if (ageFrom) {
    const ageRangeOr = {
      $or: [
        { "ageRange.from": { $gte: Number(ageFrom) } },
        { "ageRange.to": { $exists: false } },
      ],
    };
    query.$and = query.$and ? query.$and.concat(ageRangeOr) : [ageRangeOr];
  }

  if (priceMin && priceMax) {
    query.price = { $gte: priceMin, $lte: priceMax };
  }

  query.isPublished = true;
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
});

router.get("/back-office", [auth, admin], async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
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
});

router.get("/:id/variants", async (req, res) => {
  const product = await Product.findById(req.params.id).populate({
    path: "variants",
    select: "-__v -cost",
    populate: { path: "categories", select: "-__v" },
  });
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  res.send(product.variants);
});

router.get("/:id/related", async (req, res) => {
  const product = await Product.findById(req.params.id).populate({
    path: "relatedProducts",
    select: "-__v -cost",
    populate: { path: "categories", select: "-__v" },
    options: { limit: 10 },
  });
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  let relatedProducts = product.relatedProducts;

  if (!relatedProducts.length) {
    const relatedProductsQuery = {
      categories: { $in: product.categories },
      _id: { $ne: product._id },
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

    relatedProducts = await Product.find(relatedProductsQuery)
      .populate({ path: "categories", select: "-__v" })
      .select("-__v -cost")
      .limit(10);
  }

  res.send(relatedProducts.filter((product) => product.isPublished));
});

router.get("/related", async (req, res) => {
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
});

router.get("/:urlName/meta", async (req, res) => {
  let product = await Product.findOne({ urlName: req.params.urlName }).select(
    "name description"
  );
  if (!product)
    return res
      .status(404)
      .send("The product with the given URL name was not found.");

  res.send(product);
});

router.get("/:urlName", async (req, res) => {
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
});

router.get("/by-id/:id", async (req, res) => {
  let product = await Product.findById(req.params.id)
    .populate({ path: "categories", select: "-__v" })
    .select("-__v -cost");
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  res.send(product);
});

router.post("/", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  const urlName = await Product.findOne({ urlName: req.body.urlName });
  if (urlName) return res.status(400).send("URL name already exists.");

  const product = new Product({
    ...omit(req.body, !req.body?.isVariantOf ? "isVariantOf" : []),
    gallery: req.body.gallery.map(
      (file) =>
        `https://${config.get("s3BucketName")}.s3.${config.get(
          "awsRegion"
        )}.amazonaws.com/${file}`
    ),
    ...(req.body.numberInStock > 0
      ? { entriesCount: req.body.numberInStock }
      : {}),
  });
  const shouldCreateInitialEntry = req.body.numberInStock > 0;

  if (req.body.isVariantOf) {
    const isVariantOf = await Product.findById(req.body.isVariantOf);
    if (!isVariantOf) return res.status(400).send("Invalid product.");
    if (isVariantOf.isVariantOf)
      return res.status(400).send("Product is already a variant.");

    isVariantOf.variants.push(product._id);

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await isVariantOf.save({ session });
        await product.save({ session });
        if (shouldCreateInitialEntry) {
          await Entry.create(
            [
              {
                productId: product._id,
                quantity: req.body.numberInStock,
                note: "Initial stock on product creation",
                createdBy: req.user._id,
              },
            ],
            { session }
          );
        }
      });

      await session.endSession();
      res.send(product);
    } catch (err) {
      await session.endSession();
      throw err;
    }
  } else {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await product.save({ session });
        if (shouldCreateInitialEntry) {
          await Entry.create(
            [
              {
                productId: product._id,
                quantity: req.body.numberInStock,
                note: "Initial stock on product creation",
                createdBy: req.user._id,
              },
            ],
            { session }
          );
        }
      });

      await session.endSession();
      res.send(product);
    } catch (err) {
      await session.endSession();
      throw err;
    }
  }
});

router.put("/:id", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  const product = await Product.findById(req.params.id);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  if (product.urlName !== req.body.urlName) {
    const urlName = await Product.findOne({ urlName: req.body.urlName });
    if (urlName) return res.status(400).send("URL name already exists.");
  }

  let oldIsVariantOf = product.isVariantOf;

  product.set({
    ...omit(req.body, !req.body?.isVariantOf ? "isVariantOf" : []),
    gallery: req.body.gallery.map(
      (file) =>
        `https://${config.get("s3BucketName")}.s3.${config.get(
          "awsRegion"
        )}.amazonaws.com/${file}`
    ),
  });

  if (req.body.isVariantOf) {
    const isVariantOf = await Product.findById(req.body.isVariantOf);
    if (!isVariantOf) return res.status(400).send("Invalid product.");
    if (isVariantOf.isVariantOf)
      return res.status(400).send("Product is already a variant.");

    isVariantOf.variants.push(product._id);

    if (oldIsVariantOf) {
      oldIsVariantOf = await Product.findById(oldIsVariantOf);
      const index = oldIsVariantOf.variants.indexOf(product._id);
      if (index !== -1) {
        oldIsVariantOf.variants.splice(index, 1);
      }
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await oldIsVariantOf?.save({ session });
        await isVariantOf.save({ session });
        await product.save({ session });
      });

      await session.endSession();
      res.send(product);
    } catch (err) {
      await session.endSession();
      throw err;
    }
  } else {
    await product.save();
    res.send(product);
  }
});

router.patch("/:id/publish", [auth, admin], async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  product.isPublished = req.body.isPublished;
  await product.save();

  res.send(product);
});

router.delete("/:id", [auth, admin], async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  const [hasSales, hasEntries] = await Promise.all([
    Sale.exists({ productId: product._id }),
    Entry.exists({ productId: product._id }),
  ]);
  if (hasSales || hasEntries)
    return res
      .status(400)
      .send("Cannot delete product with existing sales or entries.");

  if (product.isVariantOf) {
    const isVariantOf = await Product.findById(product.isVariantOf);
    const index = isVariantOf.variants.indexOf(product._id);
    if (index !== -1) {
      isVariantOf.variants.splice(index, 1);
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await isVariantOf.save({ session });
        await product.deleteOne({ session });
      });

      await session.endSession();
      res.send(product);
    } catch (err) {
      await session.endSession();
      throw err;
    }
  } else if (product.variants.length) {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await Product.updateMany(
          { _id: { $in: product.variants } },
          { $unset: { isVariantOf: "" } },
          { session }
        );
        await product.deleteOne({ session });
      });

      await session.endSession();
      res.send(product);
    } catch (err) {
      await session.endSession();
      throw err;
    }
  } else {
    await product.deleteOne();
    res.send(product);
  }
});

module.exports = router;
