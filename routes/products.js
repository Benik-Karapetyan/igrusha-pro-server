const config = require("config");
const router = require("express").Router();
const mongoose = require("mongoose");
const { Product, validate } = require("../models/product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { omit } = require("lodash");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  const search = req.query.search || "";
  const sectionName = req.query.sectionName;

  const query = {
    "name.en": { $regex: search, $options: "i" },
  };

  if (sectionName) {
    query.sectionName = sectionName;
  }

  const products = await Product.find(query)
    .populate("variants")
    .populate("relatedProducts")
    .sort({ createdAt: 1 })
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

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("variants")
    .populate("relatedProducts");
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  res.send(product);
});

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  const product = new Product({
    ...omit(req.body, !req.body.isVariantOf ? "isVariantOf" : ""),
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

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
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

router.put("/:id", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  const product = await Product.findById(req.params.id);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  let oldIsVariantOf = product.isVariantOf;

  product.set({
    ...omit(req.body, !req.body.isVariantOf ? "isVariantOf" : ""),
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

router.delete("/:id", [auth, admin], async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

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
