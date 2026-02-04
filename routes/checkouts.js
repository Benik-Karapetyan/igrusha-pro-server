const router = require("express").Router();
const mongoose = require("mongoose");
const {
  Checkout,
  validate,
  validateCheckoutQuantityChange,
} = require("../models/checkout");
const { Product } = require("../models/product");
const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  const checkouts = await Checkout.find()
    .skip(skip)
    .limit(pageSize)
    .select("-__v");
  const totalRecords = await Checkout.countDocuments();

  res.send({
    items: checkouts,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.get("/:id", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Checkout not found.");

  const checkout = await Checkout.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate({
    path: "items.productId",
    select: "-__v -cost",
    populate: { path: "categories", select: "-__v" },
  });
  if (!checkout || checkout.status !== "active")
    return res.status(404).send("Checkout not found.");

  res.send(checkout);
});

router.post("/", auth, async (req, res) => {
  const { error } = validate({ ...req.body, userId: req.user._id });
  if (error) return res.status(400).send(error.message);

  const productIds = req.body.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    return res.status(404).send("One or more products not found.");
  }

  const checkout = new Checkout({
    userId: req.user._id,
    status: "active",
    items: req.body.items,
  });

  await checkout.save();
  res.send(checkout);
});

router.patch("/:id/quantity", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Checkout not found.");

  let checkout = await Checkout.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!checkout) return res.status(404).send("Checkout not found.");

  const { error } = validateCheckoutQuantityChange(req.body);
  if (error) return res.status(400).send(error.message);

  const item = checkout.items.find(
    (item) => item.productId.toString() === req.body.productId
  );
  if (!item) return res.status(404).send("Item not found.");

  item.quantity = req.body.quantity;

  await checkout.save();
  res.send(checkout);
});

router.delete("/:id/items/:itemId", auth, async (req, res) => {
  if (
    !mongoose.Types.ObjectId.isValid(req.params.id) ||
    !mongoose.Types.ObjectId.isValid(req.params.itemId)
  )
    return res.status(404).send("Checkout not found.");

  let checkout = await Checkout.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!checkout) return res.status(404).send("Checkout not found.");

  const index = checkout.items.findIndex(
    (item) => item.productId.toString() === req.params.itemId
  );
  if (index === -1) return res.status(404).send("Item not found.");

  checkout.items.splice(index, 1);

  await checkout.save();
  res.send(checkout);
});

module.exports = router;
