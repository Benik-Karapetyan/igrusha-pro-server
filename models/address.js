const Joi = require("joi");
const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  street: { type: String, required: true, minlength: 3, maxlength: 100 },
  building: { type: Number, required: true, positive: true },
  entrance: { type: Number, required: false, positive: true },
  floor: { type: Number, required: false, positive: true },
  apartment: { type: Number, required: false, positive: true },
  zip: { type: String, required: false, maxlength: 10 },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Address = mongoose.model("Address", AddressSchema);

const addressJoiSchema = Joi.object({
  street: Joi.string().min(3).max(100).required(),
  building: Joi.number().positive().required(),
  entrance: Joi.number().positive().optional(),
  floor: Joi.number().positive().optional(),
  apartment: Joi.number().positive().optional(),
  zip: Joi.string().max(10).optional(),
});

const validateAddress = (address) => addressJoiSchema.validate(address);

module.exports = {
  Address,
  AddressSchema,
  addressJoiSchema,
  validate: validateAddress,
};
