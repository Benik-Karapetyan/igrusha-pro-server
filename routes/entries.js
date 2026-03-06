const router = require("express").Router();
const mongoose = require("mongoose");
const { Product } = require("../models/product");
const { Entry, validate } = require("../models/entry");
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

  const entries = await Entry.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate("productId", "-__v")
    .populate("createdBy", "-__v")
    .select("-__v");
  const totalRecords = await Entry.countDocuments(query);

  res.send({
    items: entries,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.get("/by-product/:productId", [auth, admin], async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.productId))
    return res.status(400).send("Invalid product ID.");

  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  const query = { productId: req.params.productId };

  const entries = await Entry.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate("productId", "-__v")
    .populate("createdBy", "-__v")
    .select("-__v");
  const totalRecords = await Entry.countDocuments(query);

  res.send({
    items: entries,
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

  const session = await mongoose.startSession();

  try {
    const entry = new Entry({
      ...req.body,
      createdBy: req.user._id,
    });

    await session.withTransaction(async () => {
      product.numberInStock += req.body.quantity;
      product.entriesCount += req.body.quantity;
      await product.save({ session });
      await entry.save({ session });
    });

    await session.endSession();
    await entry.populate("productId", "-__v");
    await entry.populate("createdBy", "-__v");
    res.send(entry);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

router.put("/:id", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  const entry = await Entry.findById(req.params.id);
  if (!entry)
    return res.status(404).send("The entry with the given ID was not found.");

  if (entry.productId.toString() !== req.body.productId.toString())
    return res
      .status(400)
      .send("Changing product for an entry is not allowed.");

  const product = await Product.findById(entry.productId);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  const previousQuantity = entry.quantity;
  const nextQuantity = req.body.quantity;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const quantityDelta = nextQuantity - previousQuantity;
      product.numberInStock += quantityDelta;
      product.entriesCount += quantityDelta;
      await product.save({ session });

      entry.set({
        ...req.body,
        createdBy: req.user._id,
      });
      await entry.save({ session });
    });

    await session.endSession();
    await entry.populate("productId", "-__v");
    await entry.populate("createdBy", "-__v");
    res.send(entry);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

router.delete("/:id", [auth, admin], async (req, res) => {
  const entry = await Entry.findById(req.params.id);
  if (!entry)
    return res.status(404).send("The entry with the given ID was not found.");

  const product = await Product.findById(entry.productId);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  try {
    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      product.numberInStock -= entry.quantity;
      product.entriesCount -= entry.quantity;
      await product.save({ session });
      await entry.deleteOne({ session });
    });

    await session.endSession();
    res.send(entry);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

module.exports = router;
