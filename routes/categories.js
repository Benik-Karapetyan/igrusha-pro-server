const config = require("config");
const router = require("express").Router();
const mongoose = require("mongoose");
const { Category, validate } = require("../models/category");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  const sort = req.query.sort || "_id";

  const categories = await Category.find({ isPublished: true })
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .select("-__v");
  const totalRecords = await Category.countDocuments();

  res.send({
    items: categories,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.get("/back-office", [auth, admin], async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  const sort = req.query.sort || "_id";

  const categories = await Category.find()
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .select("-__v");
  const totalRecords = await Category.countDocuments();

  res.send({
    items: categories,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.get("/:urlName", async (req, res) => {
  const category = await Category.findOne({
    urlName: req.params.urlName,
  }).select("image title description name");
  if (!category || !category.isPublished)
    return res
      .status(404)
      .send("The category with the given URL name was not found.");

  res.send(category);
});

router.post("/", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  let category = await Category.findOne({ urlName: req.body.urlName });
  if (category) return res.status(400).send("Category already exists.");

  category = new Category({
    ...req.body,
    image: `https://${config.get("s3BucketName")}.s3.${config.get(
      "awsRegion"
    )}.amazonaws.com/${req.body.image}`,
  });
  await category.save();

  res.send(category);
});

router.put("/:id", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(404)
      .send("The category with the given ID was not found.");
  }

  const category = await Category.findOneAndUpdate(
    { _id: req.params.id },
    {
      ...req.body,
      image: `https://${config.get("s3BucketName")}.s3.${config.get(
        "awsRegion"
      )}.amazonaws.com/${req.body.image}`,
    },
    { new: true }
  );
  if (!category)
    return res
      .status(404)
      .send("The category with the given ID was not found.");

  res.send(category);
});

router.patch("/:id/publish", [auth, admin], async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category)
    return res
      .status(404)
      .send("The category with the given ID was not found.");

  category.isPublished = req.body.isPublished;
  await category.save();

  res.send(category);
});

router.delete("/:id", [auth, admin], async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(404)
      .send("The category with the given ID was not found.");
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category)
    return res
      .status(404)
      .send("The category with the given ID was not found.");

  res.send(category);
});

module.exports = router;
