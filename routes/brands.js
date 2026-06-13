const router = require("express").Router();
const mongoose = require("mongoose");
const { Brand, validate } = require("../models/brand");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  const sort = req.query.sort || "_id";

  const brands = await Brand.find()
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .select("-__v");
  const totalRecords = await Brand.countDocuments();

  res.send({
    items: brands,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.get("/:urlName", async (req, res) => {
  const brand = await Brand.findOne({
    urlName: req.params.urlName,
  }).select("title description name");
  if (!brand)
    return res
      .status(404)
      .send("The brand with the given URL name was not found.");

  res.send(brand);
});

router.post("/", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  let brand = await Brand.findOne({ urlName: req.body.urlName });
  if (brand) return res.status(400).send("Brand already exists.");

  brand = new Brand({ ...req.body });
  await brand.save();

  res.send(brand);
});

router.put("/:id", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).send("The brand with the given ID was not found.");
  }

  const brand = await Brand.findOneAndUpdate(
    { _id: req.params.id },
    { ...req.body },
    { new: true }
  );
  if (!brand)
    return res.status(404).send("The brand with the given ID was not found.");

  res.send(brand);
});

router.delete("/:id", [auth, admin], async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).send("The brand with the given ID was not found.");
  }

  const brand = await Brand.findByIdAndDelete(req.params.id);
  if (!brand)
    return res.status(404).send("The brand with the given ID was not found.");

  res.send(brand);
});

module.exports = router;
