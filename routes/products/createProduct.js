const config = require("config");
const mongoose = require("mongoose");
const omit = require("lodash/omit");
const { Product, validate } = require("../../models/product");
const { Entry } = require("../../models/entry");

const createProduct = async (req, res) => {
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
};

module.exports = createProduct;
