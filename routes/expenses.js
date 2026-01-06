const router = require("express").Router();
const { Expense, validate } = require("../models/expense");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { startOfMonth, startOfDay, endOfDay } = require("date-fns");

router.get("/", [auth, admin], async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  let types = req.query.types
    ? Array.isArray(req.query.types)
      ? req.query.types
      : [req.query.types]
    : [];

  const fromDate = req.query.from
    ? startOfDay(new Date(req.query.from))
    : startOfDay(startOfMonth(new Date()));

  const toDate = req.query.to
    ? endOfDay(new Date(req.query.to))
    : endOfDay(new Date());

  const query = {};

  if (types.length) {
    query.type = { $in: types };
  }
  query.createdAt = { $gte: fromDate, $lte: toDate };

  const expenses = await Expense.find(query)
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(pageSize)
    .populate("createdBy", "-__v")
    .select("-__v");
  const totalRecords = await Expense.countDocuments(query);
  const totalAmountResult = await Expense.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);
  const totalAmount =
    totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

  res.send({
    items: expenses,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
    totalAmount,
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
