const Joi = require("joi");
const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "products",
      "logistics",
      "tax",
      "rent",
      "advertisement",
      "salary",
      "utilities",
    ],
    required: true,
  },
  description: {
    type: String,
    required: true,
    max: 1024,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Expense = mongoose.model("Expense", ExpenseSchema);

const validateExpense = (expense) => {
  const schema = Joi.object({
    type: Joi.string()
      .valid(
        "products",
        "logistics",
        "tax",
        "rent",
        "advertisement",
        "salary",
        "utilities"
      )
      .required(),
    description: Joi.string().max(1024).required(),
    amount: Joi.number().min(0).required(),
    createdAt: Joi.date().optional(),
  });

  return schema.validate(expense);
};

module.exports = { Expense, validate: validateExpense };
