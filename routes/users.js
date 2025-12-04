const auth = require("../middleware/auth");
const router = require("express").Router();
const { User, validateFavorite } = require("../models/user");
const { Product } = require("../models/product");

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
