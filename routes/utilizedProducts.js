const router = require("express").Router();
const mongoose = require("mongoose");
const { Product } = require("../models/product");
const { UtilizedProduct, validate } = require("../models/utilizedProduct");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", [auth, admin], async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  const query = {};
  if (req.query.productId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.productId))
      return res.status(400).send("Invalid product ID.");
    query.productId = req.query.productId;
  }

  const utilizedProducts = await UtilizedProduct.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate({
      path: "productId",
      select: "-__v",
      populate: { path: "categories", select: "-__v" },
    })
    .populate("createdBy", "-__v")
    .select("-__v");
  const totalRecords = await UtilizedProduct.countDocuments(query);

  res.send({
    items: utilizedProducts,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.post("/", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  const product = await Product.findById(req.body.productId);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");
  if (req.body.quantity > product.numberInStock)
    return res.status(400).send("Insufficient stock.");

  const session = await mongoose.startSession();

  try {
    const utilizedProduct = new UtilizedProduct({
      productId: req.body.productId,
      quantity: req.body.quantity,
      note: req.body.note,
      createdAt: req.body.createdAt,
      createdBy: req.user._id,
    });

    await session.withTransaction(async () => {
      product.numberInStock -= req.body.quantity;
      product.utilizedCount += req.body.quantity;
      await product.save({ session });
      await utilizedProduct.save({ session });
    });

    await session.endSession();
    await utilizedProduct.populate("productId", "-__v");
    await utilizedProduct.populate("createdBy", "-__v");
    res.send(utilizedProduct);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

router.delete("/:id", [auth, admin], async (req, res) => {
  const utilizedProduct = await UtilizedProduct.findById(req.params.id);
  if (!utilizedProduct)
    return res
      .status(404)
      .send("The utilized product with the given ID was not found.");

  const product = await Product.findById(utilizedProduct.productId);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  await utilizedProduct.deleteOne();

  product.utilizedCount -= utilizedProduct.quantity;
  product.numberInStock += utilizedProduct.quantity;
  await product.save();

  res.send(utilizedProduct);
});

module.exports = router;
