const router = require("express").Router();
const mongoose = require("mongoose");
const { Order, validate } = require("../models/order");
const { Checkout } = require("../models/checkout");
const { Product } = require("../models/product");
const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 100;
  const skip = (page - 1) * pageSize;

  const orders = await Order.find().skip(skip).limit(pageSize).select("-__v");
  const totalRecords = await Order.countDocuments();

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
  if (!checkout) return res.status(404).send("Checkout not found.");

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

  for (const product of products) {
    const requestedQty = requestedQtyByProductId[product._id.toString()];
    if (requestedQty > product.numberInStock) {
      outOfStockProducts.push({
        productId: product._id,
        numberInStock: product.numberInStock,
      });
    }
  }

  if (outOfStockProducts.length > 0) {
    return res.status(400).send({
      products: outOfStockProducts,
      message: "Insufficient stock",
    });
  }

  // const order = new Order({
  //   userId: req.user._id,
  //   checkoutId: req.body.checkoutId,
  //   status: "onTheWay",
  //   items: req.body.items,
  // });

  await order.save();
  res.send(order);
});

module.exports = router;
