const router = require("express").Router();
const { User, validate, validateFavorite } = require("../models/user");
const { Product } = require("../models/product");
const bcrypt = require("bcrypt");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  const users = await User.find()
    .skip(skip)
    .limit(pageSize)
    .select("-password -__v");
  const totalRecords = await User.countDocuments();

  res.send({
    items: users,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.post("/", auth, admin, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.message);

  const user = new User({ ...req.body, isAdmin: true });
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  await user.save();

  res.send(user);
});

router.patch("/:id/favorites", auth, async (req, res) => {
  const { error } = validateFavorite(req.body);
  if (error) return res.status(400).send(error.message);

  const product = await Product.findById(req.body.productId);
  if (!product) return res.status(404).send("Product not found.");

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { favorites: product._id } },
    { new: true }
  );
  if (!user) return res.status(404).send("User not found.");

  res.send(user);
});

router.delete("/:id/favorites/:productId", auth, async (req, res) => {
  const { error } = validateFavorite({ productId: req.params.productId });
  if (error) return res.status(400).send(error.message);

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $pull: { favorites: req.params.productId } },
    { new: true }
  );
  if (!user) return res.status(404).send("User not found.");

  res.send(user);
});

module.exports = router;
