const config = require("config");
const router = require("express").Router();
const mongoose = require("mongoose");
const { Product } = require("../models/product");
const { Cart } = require("../models/cart");
const { Checkout } = require("../models/checkout");
const {
  Order,
  validate,
  validateReason,
  getDiscountedPrice,
  validateAdminOrder,
} = require("../models/order");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .select("-__v")
    .populate({
      path: "userId",
      select: "-__v",
    })
    .populate({
      path: "items.productId",
      select: "-__v",
    });
  const totalRecords = await Order.countDocuments();
  const totalAmountResult = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);
  const totalAmount =
    totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

  res.send({
    items: orders,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
    totalAmount,
  });
});

router.get("/user/:id", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  const orders = await Order.find({ userId: req.params.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .select("-__v")
    .populate({
      path: "items.productId",
      select: "-__v",
    });
  const totalRecords = await Order.countDocuments({ userId: req.params.id });

  res.send({
    items: orders,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.get("/:id", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Checkout not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })
    .populate({
      path: "items.productId",
      select: "-__v",
    })
    .populate({
      path: "checkoutId",
      select: "-__v",
    });
  if (!order) return res.status(404).send("Order not found.");

  res.send(order);
});

router.post("/", auth, async (req, res) => {
  const { error } = validate({ ...req.body, userId: req.user._id });
  if (error) return res.status(400).send(error.message);

  const checkout = await Checkout.findOne({
    _id: req.body.checkoutId,
    userId: req.user._id,
  });
  if (!checkout || checkout.status !== "active")
    return res.status(404).send("Checkout not found.");
  checkout.status = "completed";

  const requestedQtyByProductId = {};
  for (const item of req.body.items) {
    const key = item.productId.toString();
    requestedQtyByProductId[key] = item.quantity;
  }

  const productIds = req.body.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    return res.status(404).send("One or more products not found.");
  }

  const outOfStockProducts = [];
  let totalAmount = 0;

  for (const product of products) {
    const requestedQty = requestedQtyByProductId[product._id.toString()];
    if (requestedQty > product.numberInStock) {
      outOfStockProducts.push({
        productId: product._id,
        numberInStock: product.numberInStock,
      });
    }
    totalAmount +=
      getDiscountedPrice(product.price, product.discount) * requestedQty;
  }

  const shippingFee =
    totalAmount < config.get("freeShippingThreshold")
      ? config.get("shippingFee")
      : 0;
  totalAmount += shippingFee;

  if (outOfStockProducts.length > 0) {
    return res.status(400).send({
      products: outOfStockProducts,
      message: "Insufficient stock",
    });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).send("Cart not found.");

  const productIdSet = new Set(
    productIds.map((id) => new mongoose.Types.ObjectId(id).toString())
  );
  cart.items = cart.items.filter(
    (item) => !productIdSet.has(item.productId.toString())
  );

  const session = await mongoose.startSession();

  try {
    const order = new Order({
      userId: req.user._id,
      checkoutId: req.body.checkoutId,
      status: "onTheWay",
      paymentMethod: req.body.paymentMethod,
      orderInstructions: req.body.orderInstructions,
      shippingFee,
      totalAmount,
      items: products.map((product) => ({
        productId: product._id,
        quantity: requestedQtyByProductId[product._id.toString()],
        discount: product.discount,
      })),
    });

    await session.withTransaction(async () => {
      for (const product of products) {
        const requestedQty = requestedQtyByProductId[product._id.toString()];
        product.numberInStock -= requestedQty;
        await product.save({ session });
      }

      await cart.save({ session });
      await checkout.save({ session });
      await order.save({ session });
    });

    await session.endSession();
    await order.populate({
      path: "items.productId",
      select: "-__v",
    });
    res.send(order);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

router.post("/admin", [auth, admin], async (req, res) => {
  const { error } = validateAdminOrder({ ...req.body, userId: req.user._id });
  if (error) return res.status(400).send(error.message);

  const requestedQtyByProductId = {};
  for (const item of req.body.items) {
    const key = item.productId.toString();
    requestedQtyByProductId[key] = item.quantity;
  }
  const requestedDiscountByProductId = {};
  for (const item of req.body.items) {
    const key = item.productId.toString();
    requestedDiscountByProductId[key] = item.discount;
  }

  const productIds = req.body.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    return res.status(404).send("One or more products not found.");
  }

  const outOfStockProducts = [];
  let totalAmount = 0;

  for (const product of products) {
    const requestedQty = requestedQtyByProductId[product._id.toString()];
    if (requestedQty > product.numberInStock) {
      outOfStockProducts.push({
        productId: product._id,
        numberInStock: product.numberInStock,
      });
    }
    totalAmount +=
      getDiscountedPrice(
        product.price,
        requestedDiscountByProductId[product._id.toString()]
      ) * requestedQty;
  }

  const shippingFee =
    req.body.shippingFee === 0 || req.body.shippingFee
      ? req.body.shippingFee
      : totalAmount < config.get("freeShippingThreshold")
      ? config.get("shippingFee")
      : 0;
  totalAmount += shippingFee;

  if (outOfStockProducts.length > 0) {
    return res.status(400).send({
      products: outOfStockProducts,
      message: "Insufficient stock",
    });
  }

  const session = await mongoose.startSession();

  try {
    const order = new Order({
      userId: req.user._id,
      checkoutId: req.body.checkoutId,
      status: "delivered",
      items: products.map((product) => ({
        productId: product._id,
        quantity: requestedQtyByProductId[product._id.toString()],
        discount: requestedDiscountByProductId[product._id.toString()],
      })),
      paymentMethod: req.body.paymentMethod,
      orderInstructions: req.body.orderInstructions,
      shippingFee,
      totalAmount,
      ...(req.body.createdAt ? { createdAt: req.body.createdAt } : {}),
      ...(req.body.createdAt ? { deliveredAt: req.body.createdAt } : {}),
    });

    await session.withTransaction(async () => {
      for (const product of products) {
        const requestedQty = requestedQtyByProductId[product._id.toString()];
        product.numberInStock -= requestedQty;
        await product.save({ session });
      }

      await order.save({ session });
    });

    await session.endSession();
    await order.populate({
      path: "items.productId",
      select: "-__v",
    });
    res.send(order);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

router.patch("/:id/complete", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!order) return res.status(404).send("Order not found.");

  order.status = "delivered";
  order.deliveredAt = Date.now();
  await order.save();

  res.send(order);
});

router.patch("/:id/cancel", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!order) return res.status(404).send("Order not found.");

  const { error } = validateReason(req.body);
  if (error) return res.status(400).send(error.message);

  const productIds = order.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    return res.status(404).send("One or more products not found.");
  }

  const quantityByProductId = {};
  for (const item of order.items) {
    const key = item.productId.toString();
    quantityByProductId[key] = item.quantity;
  }

  const session = await mongoose.startSession();

  try {
    order.status = "cancelled";
    order.cancellationReason = req.body.reason;

    await session.withTransaction(async () => {
      for (const product of products) {
        const quantity = quantityByProductId[product._id.toString()];
        product.numberInStock += quantity;
        await product.save({ session });
      }

      await order.save({ session });
    });

    await session.endSession();
    res.send(order);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

router.patch("/:id/return", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!order) return res.status(404).send("Order not found.");

  const { error } = validateReason(req.body);
  if (error) return res.status(400).send(error.message);

  order.status = "returnPending";
  order.returnReason = req.body.reason;
  await order.save();

  res.send(order);
});

router.patch("/:id/confirm-return", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    status: "returnPending",
  });
  if (!order) return res.status(404).send("Order not found.");

  const productIds = order.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    return res.status(404).send("One or more products not found.");
  }

  const quantityByProductId = {};
  for (const item of order.items) {
    const key = item.productId.toString();
    quantityByProductId[key] = item.quantity;
  }

  const session = await mongoose.startSession();

  try {
    order.status = "returned";
    order.returnedAt = Date.now();

    await session.withTransaction(async () => {
      for (const product of products) {
        const quantity = quantityByProductId[product._id.toString()];
        product.numberInStock += quantity;
        await product.save({ session });
      }

      await order.save({ session });
    });

    await session.endSession();
    res.sendStatus(204);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

module.exports = router;
