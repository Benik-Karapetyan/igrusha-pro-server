const router = require("express").Router();
const mongoose = require("mongoose");
const { Cart, validateCartItems } = require("../models/cart");
const { Product } = require("../models/product");
const { User } = require("../models/user");
const auth = require("../middleware/auth");

router.get("/:userId", auth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.params.userId }).populate(
    "items.productId",
    "-__v"
  );
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
      } else {
        cart.items.push(newItem);
      }
    });
  }

  await cart.save();
  await cart.populate("items.productId", "-__v");

  res.send(cart);
});

router.put("/:userId", auth, async (req, res) => {
  const { items } = req.body;

  if (!items) return res.status(400).send("Items is required");
  if (!Array.isArray(items))
    return res.status(400).send("Items must be an array");

  const { error } = validateCartItems(items);
  if (error) return res.status(400).send(error.message);

  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).send("User not found.");

  if (items.length === 0) {
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
    return res.send(cart);
  }

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
    cart.items = items;
  }

  await cart.save();
  await cart.populate("items.productId", "-__v");

  res.send(cart);
});

router.delete("/:userId/items/:productId", auth, async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).send("User not found.");

  const cart = await Cart.findOne({ user: req.params.userId });
  if (!cart) return res.status(404).send("Cart not found.");

  const productId = new mongoose.Types.ObjectId(req.params.productId);
  cart.items = cart.items.filter(
    (item) => item.productId.toString() !== productId.toString()
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
