const Joi = require("joi");
const mongoose = require("mongoose");

const EntrySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  note: {
    type: String,
    max: 1024,
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

const Entry = mongoose.model("Entry", EntrySchema);

const validateEntry = (entry) => {
  const schema = Joi.object({
    productId: Joi.objectId().required(),
    quantity: Joi.number().integer().min(1).required(),
    note: Joi.string().max(1024).allow("").optional(),
    createdAt: Joi.date().optional(),
  });

  return schema.validate(entry);
};

module.exports = { Entry, validate: validateEntry };
