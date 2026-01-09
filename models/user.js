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
  addresses: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Address",
    default: [],
  },
  favorites: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Product",
    default: [],
  },
  termsAndConditions: { type: Boolean, required: true },
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
    addresses: Joi.array().items(Joi.objectId()).default([]),
    termsAndConditions: Joi.boolean().required(),
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

const validateFavorite = (productId) => {
  const schema = Joi.object({
    productId: Joi.objectId().required(),
  });

  return schema.validate(productId);
};

module.exports = {
  User,
  validate: validateUser,
  validateSignIn,
  validateFavorite,
};
