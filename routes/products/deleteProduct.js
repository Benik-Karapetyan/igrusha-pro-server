const mongoose = require("mongoose");
const { Product } = require("../../models/product");
const { Sale } = require("../../models/sale");
const { Entry } = require("../../models/entry");

const deleteProduct = async (req, res) => {
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
};

module.exports = deleteProduct;
