const router = require("express").Router();
const mongoose = require("mongoose");
const { Product } = require("../models/product");
const { Sale, validate } = require("../models/sale");
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

  const sales = await Sale.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate("productId", "-__v")
    .populate("createdBy", "-__v")
    .select("-__v");
  const totalRecords = await Sale.countDocuments(query);

  res.send({
    items: sales,
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
    const sale = new Sale({
      productId: req.body.productId,
      quantity: req.body.quantity,
      note: req.body.note,
      createdAt: req.body.createdAt,
      source: "manual",
      createdBy: req.user._id,
    });

    await session.withTransaction(async () => {
      product.numberInStock -= req.body.quantity;
      product.soldCount += req.body.quantity;
      await product.save({ session });
      await sale.save({ session });
    });

    await session.endSession();
    await sale.populate("productId", "-__v");
    await sale.populate("createdBy", "-__v");
    res.send(sale);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

module.exports = router;
