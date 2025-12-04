const config = require("config");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const mongoose = require("mongoose");
const passwordComplexity = require("joi-password-complexity");

const complexityOptions = {
  min: 8,
  max: 30,
  lowerCase: 1,
  upperCase: 1,
  numeric: 1,
  symbol: 1,
};

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, minlength: 5, maxlength: 50 },
  lastName: { type: String, required: true, minlength: 5, maxlength: 50 },
  phone: {
    type: String,
    required: true,
    unique: true,
    minlength: 12,
    maxlength: 12,
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  password: { type: String, required: true, minlength: 60, maxlength: 256 },
  address: {
    street: { type: String, required: true, minlength: 3, maxlength: 100 },
    building: { type: Number, required: true, positive: true, maxlength: 50 },
    entrance: { type: Number, required: false, positive: true, maxlength: 50 },
    floor: { type: Number, required: false, positive: true, maxlength: 50 },
    apartment: { type: Number, required: true, positive: true, maxlength: 50 },
    zip: { type: String, required: false, maxlength: 50 },
  },
  isAdmin: Boolean,
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, isAdmin: this.isAdmin },
    config.get("jwtPrivateKey")
  );
  return token;
};

const User = mongoose.model("User", userSchema);

const validateUser = (user) => {
  const schema = Joi.object({
    firstName: Joi.string().min(3).max(50).required(),
    lastName: Joi.string().min(3).max(50).required(),
    email: Joi.string().min(5).max(255).required().email(),
    phone: Joi.string().min(12).max(12).required(),
    password: Joi.string().required(),
    address: {
      street: Joi.string().min(3).max(100).required(),
      building: Joi.number().positive().required(),
      entrance: Joi.number().positive().optional(),
      floor: Joi.number().positive().optional(),
      apartment: Joi.number().positive().required(),
      zip: Joi.string().optional(),
    },
  });

  const { error: passwordError } = passwordComplexity(
    complexityOptions
  ).validate(user.password);

  if (passwordError && passwordError.details.length)
    return {
      error: { message: passwordError.details[0].message },
    };

  return schema.validate(user);
};

const validateSignIn = (req) => {
  const schema = Joi.object({
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
  });

  return schema.validate(req);
};

module.exports = {
  User,
  validate: validateUser,
  validateSignIn,
};
