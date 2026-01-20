const config = require("config");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const mongoose = require("mongoose");
const passwordComplexity = require("joi-password-complexity");
const { AddressSchema } = require("./address");

const complexityOptions = {
  min: 8,
  max: 30,
  lowerCase: 1,
  upperCase: 1,
  numeric: 1,
};

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  password: { type: String, required: true, minlength: 60, maxlength: 256 },
  termsAndConditions: { type: Boolean, required: true },
  firstName: { type: String, minlength: 5, maxlength: 50 },
  lastName: { type: String, minlength: 5, maxlength: 50 },
  phone: {
    type: String,
    minlength: 12,
    maxlength: 12,
  },
  isVerified: { type: Boolean, default: false },
  eligibleForResetPassword: { type: Boolean },
  verificationCode: { type: String, minlength: 6, maxlength: 6 },
  verificationCodeExpiry: { type: Date },
  address: {
    type: AddressSchema,
  },
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
  isAdmin: Boolean,
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, isVerified: this.isVerified, isAdmin: this.isAdmin },
    config.get("jwtPrivateKey")
  );
  return token;
};

const User = mongoose.model("User", userSchema);

const validateUser = (user) => {
  const schema = Joi.object({
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().required(),
    termsAndConditions: Joi.boolean().required(),
    firstName: Joi.string().min(3).max(50).required(),
    lastName: Joi.string().min(3).max(50).required(),
    phone: Joi.string().min(12).max(12).required(),
    addresses: Joi.array().items(Joi.objectId()).default([]),
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

const validatePassword = (password) => {
  const { error: passwordError } =
    passwordComplexity(complexityOptions).validate(password);

  if (passwordError && passwordError.details.length)
    return {
      error: { message: passwordError.details[0].message },
    };

  return { error: null };
};

const validateSignUp = (user) => {
  const schema = Joi.object({
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().required(),
    termsAndConditions: Joi.boolean().required(),
  });

  const { error: passwordError } = validatePassword(user.password);
  if (passwordError) return passwordError;

  return schema.validate(user);
};

const validateFinishSignUp = (user) => {
  const schema = Joi.object({
    firstName: Joi.string().min(3).max(50).required(),
    lastName: Joi.string().min(3).max(50).required(),
    phone: Joi.string().min(12).max(12).required(),
  });

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
  validateSignUp,
  validateFinishSignUp,
  validatePassword,
  validateFavorite,
};
