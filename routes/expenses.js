const router = require("express").Router();
const { Expense, validate } = require("../models/expense");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", [auth, admin], async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  const expenses = await Expense.find()
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(pageSize)
    .populate("createdBy", "-__v")
    .select("-__v");
  const totalRecords = await Expense.countDocuments();

  res.send({
    items: expenses,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.post("/", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  const expense = new Expense({
    ...req.body,
    createdBy: req.user._id,
  });

  await expense.save();
  res.send(expense);
});

router.put("/:id", [auth, admin], async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  const expense = await Expense.findById(req.params.id);
  if (!expense)
    return res.status(404).send("The expense with the given ID was not found.");

  expense.set({
    ...req.body,
    createdBy: req.user._id,
  });

  await expense.save();
  res.send(expense);
});

router.delete("/:id", [auth, admin], async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense)
    return res.status(404).send("The expense with the given ID was not found.");

  await expense.deleteOne();
  res.send(expense);
});

module.exports = router;
