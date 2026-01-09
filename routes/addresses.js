const router = require("express").Router();
const mongoose = require("mongoose");
const { Address, validate } = require("../models/address");
const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  const sort = req.query.sort || "-createdAt";

  const addresses = await Address.find()
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .select("-__v");
  const totalRecords = await Address.countDocuments();

  res.send({
    items: addresses,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.get("/:id", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).send("The address with the given ID was not found.");
  }

  const address = await Address.findById(req.params.id).select("-__v");
  if (!address)
    return res.status(404).send("The address with the given ID was not found.");

  res.send(address);
});

router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  const address = new Address(req.body);
  await address.save();

  res.send(address);
});

router.put("/:id", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).send("The address with the given ID was not found.");
  }

  const address = await Address.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).select("-__v");
  if (!address)
    return res.status(404).send("The address with the given ID was not found.");

  res.send(address);
});

router.delete("/:id", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).send("The address with the given ID was not found.");
  }

  const address = await Address.findByIdAndDelete(req.params.id);
  if (!address)
    return res.status(404).send("The address with the given ID was not found.");

  res.send(address);
});

module.exports = router;
