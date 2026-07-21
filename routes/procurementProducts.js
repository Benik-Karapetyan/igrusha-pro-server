const config = require("config");
const router = require("express").Router();
const mongoose = require("mongoose");
const {
  ProcurementProduct,
  validate,
} = require("../models/procurementProduct");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  const sort = req.query.sort || "_id";

  const procurementProducts = await ProcurementProduct.find()
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .select("-__v");
  const totalRecords = await ProcurementProduct.countDocuments();

  res.send({
    items: procurementProducts,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.post("/", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  let procurementProduct = await ProcurementProduct.findOne({
    url: req.body.url,
  });
  if (procurementProduct)
    return res.status(400).send("Procurement product already exists.");

  procurementProduct = new ProcurementProduct({
    ...req.body,
    image: `https://${config.get("s3BucketName")}.s3.${config.get(
      "awsRegion"
    )}.amazonaws.com/${req.body.image}`,
  });
  await procurementProduct.save();

  res.send(procurementProduct);
});

router.put("/:id", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(404)
      .send("The procurement product with the given ID was not found.");
  }

  const procurementProduct = await ProcurementProduct.findOneAndUpdate(
    { _id: req.params.id },
    {
      ...req.body,
      image: `https://${config.get("s3BucketName")}.s3.${config.get(
        "awsRegion"
      )}.amazonaws.com/${req.body.image}`,
    },
    { new: true }
  );
  if (!procurementProduct)
    return res
      .status(404)
      .send("The procurement product with the given ID was not found.");

  res.send(procurementProduct);
});

router.delete("/:id", [auth, admin], async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(404)
      .send("The procurement product with the given ID was not found.");
  }

  const procurementProduct = await ProcurementProduct.findByIdAndDelete(
    req.params.id
  );
  if (!procurementProduct)
    return res
      .status(404)
      .send("The procurement product with the given ID was not found.");

  res.send(procurementProduct);
});

module.exports = router;
