const Joi = require("joi");
const mongoose = require("mongoose");

const Customer = mongoose.model(
  "Customer",
  new mongoose.Schema({
    name: { type: String, required: true, minlength: 5, maxlength: 100 },
    isGold: { type: Boolean, default: false },
    phone: { type: String, required: true, minlength: 5, maxlength: 100 },
  })
);

const validateCustomer = (customer) => {
  const schema = Joi.object({
    name: Joi.string().min(5).max(100).required(),
    isGold: Joi.boolean(),
    phone: Joi.string().min(5).max(100).required(),
  });

  return schema.validate(customer);
};

module.exports = { Customer, validate: validateCustomer };
