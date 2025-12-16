const router = require("express").Router();
const mongoose = require("mongoose");
const { Cart, validateCartItems } = require("../models/cart");
const { Product } = require("../models/product");
const { User } = require("../models/user");
const auth = require("../middleware/auth");

router.get("/:userId", auth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.params.userId }).populate({
    path: "items.productId",
    select: "-__v",
    populate: {
      path: "relatedProducts",
      select: "-__v",
    },
  });
  if (!cart) return res.send({ user: req.params.userId, items: [] });

  res.send(cart);
});

router.post("/:userId", auth, async (req, res) => {
  const { items } = req.body;

  if (!items) return res.status(400).send("Items is required");
  if (!Array.isArray(items))
    return res.status(400).send("Items must be an array");
  if (items.length === 0)
    return res.status(400).send("Items array cannot be empty");

  const { error } = validateCartItems(items);
  if (error) return res.status(400).send(error.message);

  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).send("User not found.");

  const productIds = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    return res.status(404).send("One or more products not found.");
  }

  let cart = await Cart.findOne({ user: req.params.userId });

  if (!cart) {
    cart = new Cart({
      user: req.params.userId,
      items,
    });
  } else {
    items.forEach((newItem) => {
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === newItem.productId.toString()
      );

      if (existingItemIndex >= 0) {
        cart.items[existingItemIndex].quantity = newItem.quantity;
        cart.items[existingItemIndex].selected = newItem.selected;
      } else {
        cart.items.push(newItem);
      }
    });
  }

  await cart.save();
  await cart.populate({
    path: "items.productId",
    select: "-__v",
    populate: {
      path: "relatedProducts",
      select: "-__v",
    },
  });

  res.send(cart);
});

router.delete("/:userId/items", auth, async (req, res) => {
  const { productIds } = req.query;
  if (!productIds) return res.status(400).send("productIds is required");

  const productIdsArray = Array.isArray(productIds) ? productIds : [productIds];
  if (productIdsArray.length === 0)
    return res.status(400).send("productIds array cannot be empty");

  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).send("User not found.");

  const cart = await Cart.findOne({ user: req.params.userId });
  if (!cart) return res.status(404).send("Cart not found.");

  const productIdSet = new Set(
    productIdsArray.map((id) => new mongoose.Types.ObjectId(id).toString())
  );
  cart.items = cart.items.filter(
    (item) => !productIdSet.has(item.productId.toString())
  );

  await cart.save();
  await cart.populate("items.productId", "-__v");

  res.send(cart);
});

router.delete("/:userId", auth, async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).send("User not found.");

  let cart = await Cart.findOne({ user: req.params.userId });

  if (!cart) {
    cart = new Cart({
      user: req.params.userId,
      items: [],
    });
  } else {
    cart.items = [];
  }

  await cart.save();
  res.send(cart);
});

module.exports = router;
