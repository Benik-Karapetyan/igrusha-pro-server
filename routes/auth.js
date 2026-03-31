const router = require("express").Router();
const {
  User,
  validateSignIn,
  validateSignUp,
  validateFinishSignUp,
  validatePassword,
} = require("../models/user");
const bcrypt = require("bcrypt");
const preAuth = require("../middleware/preAuth");
const crypto = require("crypto");
const pick = require("lodash/pick");
const omit = require("lodash/omit");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../utils/email");

router.get("/me", preAuth, async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -verificationCode -verificationCodeExpiry"
  );
  if (!user) return res.status(404).send("User not found.");

  res.send(user);
});

router.post("/sign-in", async (req, res) => {
  const { error } = validateSignIn(req.body);
  if (error) return res.status(400).send(error.message);

  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send("Invalid email or password.");

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send("Invalid email or password.");

  const token = user.generateAuthToken();
  res.send({
    token,
    user: omit(user, [
      "password",
      "verificationCode",
      "verificationCodeExpiry",
    ]),
  });
});

router.post("/sign-up", async (req, res) => {
  const { error } = validateSignUp(req.body);
  if (error) return res.status(400).send(error.message);
  const { locale } = req.body;

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).send("Email already in use.");

  const verificationCode = crypto.randomInt(100000, 999999).toString();
  const verificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  user = new User({
    ...req.body,
    isAdmin: false,
    isVerified: false,
    verificationCode,
    verificationCodeExpiry,
  });

  await sendVerificationEmail(user.email, verificationCode, locale);

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  await user.save();

  const token = user.generateAuthToken();

  res
    .header("x-auth-token", token)
    .send(pick(user, ["_id", "email", "isVerified"]));
});

router.post("/verify-email", preAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).send("Verification code is required.");

  const user = await User.findOne({ verificationCode: code });
  if (!user) return res.status(400).send("invalidCode");

  if (user.verificationCodeExpiry < new Date()) {
    return res.status(400).send("verificationCodeExpired");
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpiry = undefined;
  await user.save();

  const token = user.generateAuthToken();

  res
    .header("x-auth-token", token)
    .send(pick(user, ["_id", "email", "isVerified"]));
});

router.post("/resend-verification-code", preAuth, async (req, res) => {
  const { email, locale } = req.body;
  if (!email) return res.status(400).send("Email is required.");

  const user = await User.findOne({ email });
  if (!user) return res.status(404).send("No account found with this email.");

  if (user.isVerified)
    return res.status(400).send("This email is already verified.");

  const verificationCode = crypto.randomInt(100000, 999999).toString();
  const verificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  user.verificationCode = verificationCode;
  user.verificationCodeExpiry = verificationCodeExpiry;
  await user.save();

  await sendVerificationEmail(user.email, verificationCode, locale);

  res.send("Verification email has been resent. Please check your inbox.");
});

router.post("/finish-sign-up", preAuth, async (req, res) => {
  const { error } = validateFinishSignUp(req.body);
  if (error) return res.status(400).send(error.message);

  let user = await User.findOne({ _id: req.user._id });
  if (!user) return res.status(404).send("User not found.");

  user.firstName = req.body.firstName;
  user.lastName = req.body.lastName;
  user.phone = req.body.phone;

  await user.save();

  res.send(
    omit(user, ["password", "verificationCode", "verificationCodeExpiry"])
  );
});

router.post("/reset-password", async (req, res) => {
  const { email, locale } = req.body;
  if (!email) return res.status(400).send("Email is required.");

  const user = await User.findOne({ email });
  if (!user) return res.status(404).send("No account found with this email.");

  const verificationCode = crypto.randomInt(100000, 999999).toString();
  const verificationCodeExpiry = new Date(Date.now() + 30 * 60 * 1000);

  user.verificationCode = verificationCode;
  user.verificationCodeExpiry = verificationCodeExpiry;
  user.eligibleForResetPassword = true;
  await user.save();

  await sendPasswordResetEmail(user.email, verificationCode, locale);
  res.send("Password reset email has been sent. Please check your inbox.");
});

router.post("/verify-reset-password", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).send("Verification code is required.");

  const user = await User.findOne({ verificationCode: code });
  if (!user) return res.status(400).send("invalidCode");

  if (user.verificationCodeExpiry < new Date()) {
    return res.status(400).send("verificationCodeExpired");
  }

  user.verificationCode = undefined;
  user.verificationCodeExpiry = undefined;
  await user.save();

  res.send("Password reset code verified successfully.");
});

router.post("/resend-reset-password-code", async (req, res) => {
  const { email, locale } = req.body;
  if (!email) return res.status(400).send("Email is required.");

  const user = await User.findOne({ email });
  if (!user) return res.status(404).send("No account found with this email.");

  const verificationCode = crypto.randomInt(100000, 999999).toString();
  const verificationCodeExpiry = new Date(Date.now() + 30 * 60 * 1000);

  user.verificationCode = verificationCode;
  user.verificationCodeExpiry = verificationCodeExpiry;
  user.eligibleForResetPassword = true;
  await user.save();

  await sendPasswordResetEmail(user.email, verificationCode, locale);

  res.send("Password reset email has been resent. Please check your inbox.");
});

router.post("/change-password", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).send("Email and password are required.");

  const user = await User.findOne({ email });
  if (!user || !user.eligibleForResetPassword)
    return res.status(404).send("User not found.");

  const { error } = validatePassword(password);
  if (error) return res.status(400).send(error.message);

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.eligibleForResetPassword = false;
  await user.save();

  res.send("Password changed successfully.");
});

module.exports = router;
