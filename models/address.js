const Joi = require("joi");
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true, minlength: 3, maxlength: 100 },
  building: { type: Number, required: true, positive: true },
  entrance: { type: Number, required: false, positive: true },
  floor: { type: Number, required: false, positive: true },
  apartment: { type: Number, required: false, positive: true },
  zip: { type: String, required: false, maxlength: 10 },
});

const Address = mongoose.model("Address", addressSchema);

const validateAddress = (address) => {
  const schema = Joi.object({
    street: Joi.string().min(3).max(100).required(),
    building: Joi.number().positive().required(),
    entrance: Joi.number().positive().optional(),
    floor: Joi.number().positive().optional(),
    apartment: Joi.number().positive().optional(),
    zip: Joi.string().max(10).optional(),
  });

  return schema.validate(address);
};

module.exports = {
  Address,
  validate: validateAddress,
};
