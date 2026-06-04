const config = require("config");
const omit = require("lodash/omit");
const { Product, validate } = require("../../models/product");
const mongoose = require("mongoose");

const updateProduct = async (req, res) => {
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

  const removeMaterial = !req.body.material;
  const removePoweredBy = !req.body.poweredBy;

  product.material = removeMaterial ? undefined : req.body.material;
  product.poweredBy = removePoweredBy ? undefined : req.body.poweredBy;

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
    product.isVariantOf = undefined;

    if (oldIsVariantOf) {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const parent = await Product.findById(oldIsVariantOf).session(
            session
          );
          if (parent) {
            const index = parent.variants.indexOf(product._id);
            if (index !== -1) parent.variants.splice(index, 1);
            await parent.save({ session });
          }
          await product.save({ session });
        });

        await session.endSession();
        return res.send(product);
      } catch (err) {
        await session.endSession();
        throw err;
      }
    } else {
      await product.save();
      res.send(product);
    }
  }
};

module.exports = updateProduct;
