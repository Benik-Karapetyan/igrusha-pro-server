const config = require("config");
const router = require("express").Router();
const mongoose = require("mongoose");
const { Address } = require("../models/address");
const { Product } = require("../models/product");
const { Cart } = require("../models/cart");
const { Checkout } = require("../models/checkout");
const { Sale } = require("../models/sale");
const {
  Order,
  validate,
  validateReason,
  getDiscountedPrice,
  validateAdminOrder,
} = require("../models/order");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { startOfMonth, startOfDay, endOfDay } = require("date-fns");
const omit = require("lodash/omit");

const buildOrderSaleRecords = ({
  quantityByProductId,
  note,
  createdBy,
  orderId,
  createdAt,
}) =>
  Object.entries(quantityByProductId)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({
      productId,
      quantity,
      source: "order",
      note,
      createdBy,
      orderId,
      ...(createdAt ? { createdAt } : {}),
    }));

router.get("/", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  let statuses = req.query.statuses
    ? Array.isArray(req.query.statuses)
      ? req.query.statuses
      : [req.query.statuses]
    : [];

  const fromDate = req.query.from
    ? startOfDay(new Date(req.query.from))
    : startOfDay(startOfMonth(new Date()));

  const toDate = req.query.to
    ? endOfDay(new Date(req.query.to))
    : endOfDay(new Date());

  const query = {};

  if (statuses.length) {
    query.status = { $in: statuses };
  }
  query.createdAt = { $gte: fromDate, $lte: toDate };

  const orders = await Order.find(query)
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
      select: "-__v -discount -cost",
      populate: [{ path: "categories", select: "-__v" }],
    });
  for (const order of orders) {
    for (const item of order.items) {
      if (item.productId) {
        item.productId.discount = item.discount;
      }
    }
  }
  const totalRecords = await Order.countDocuments(query);
  const totalAmountResult = await Order.aggregate([
    { $match: { ...query, status: "delivered" } },
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
      select: "-__v -discount -cost",
      populate: { path: "categories", select: "-__v" },
    });
  for (const order of orders) {
    for (const item of order.items) {
      if (item.productId) {
        item.productId.discount = item.discount;
      }
    }
  }
  const totalRecords = await Order.countDocuments({ userId: req.params.id });

  res.send({
    items: orders,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
});

router.get("/:id", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })
    .populate({
      path: "items.productId",
      select: "-__v -discount -cost",
    })
    .populate({
      path: "checkoutId",
      select: "-__v",
    });
  if (!order) return res.status(404).send("Order not found.");

  for (const item of order.items) {
    if (item.productId) {
      item.productId.discount = item.discount;
    }
  }

  res.send(order);
});

router.post("/", auth, async (req, res) => {
  const { error } = validate({
    ...req.body,
    address: omit(req.body.address, "_id"),
    userId: req.user._id,
  });
  if (error) return res.status(400).send(error.message);

  const checkout = await Checkout.findOne({
    _id: req.body.checkoutId,
    userId: req.user._id,
  });
  if (!checkout || checkout.status !== "active")
    return res.status(404).send("Checkout not found.");
  checkout.status = "completed";

  const address = await Address.findOne({
    _id: req.body.address._id,
    userId: req.user._id,
  });
  if (!address) return res.status(404).send("Address not found.");

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
  if (cart) {
    const productIdSet = new Set(
      productIds.map((id) => new mongoose.Types.ObjectId(id).toString())
    );
    cart.items = cart.items.filter(
      (item) => !productIdSet.has(item.productId.toString())
    );
  }

  const session = await mongoose.startSession();

  try {
    const order = new Order({
      userId: req.user._id,
      checkoutId: req.body.checkoutId,
      status: "onTheWay",
      address,
      paymentMethod: req.body.paymentMethod,
      shippingFee,
      totalAmount,
      orderInstructions: req.body.orderInstructions,
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
        product.soldCount = (product.soldCount || 0) + requestedQty;
        await product.save({ session });
      }

      const sales = buildOrderSaleRecords({
        quantityByProductId: requestedQtyByProductId,
        note: "Sale from user order",
        createdBy: req.user._id,
        orderId: order._id,
      });
      if (sales.length) await Sale.insertMany(sales, { session });

      if (cart) await cart.save({ session });
      await checkout.save({ session });
      await order.save({ session });
    });

    await session.endSession();
    await order.populate({
      path: "items.productId",
      select: "-__v -cost",
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

  let address = undefined;
  if (req.body.address) {
    address = await Address.findOne({
      _id: req.body.address._id,
      userId: req.user._id,
    });
  }

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
      address: address || undefined,
      paymentMethod: req.body.paymentMethod,
      shippingFee,
      totalAmount,
      orderInstructions: req.body.orderInstructions,
      items: products.map((product) => ({
        productId: product._id,
        quantity: requestedQtyByProductId[product._id.toString()],
        discount: requestedDiscountByProductId[product._id.toString()],
      })),
      ...(req.body.createdAt ? { createdAt: req.body.createdAt } : {}),
      ...(req.body.createdAt ? { deliveredAt: req.body.createdAt } : {}),
    });

    await session.withTransaction(async () => {
      for (const product of products) {
        const requestedQty = requestedQtyByProductId[product._id.toString()];
        product.numberInStock -= requestedQty;
        product.soldCount = (product.soldCount || 0) + requestedQty;
        await product.save({ session });
      }

      const sales = buildOrderSaleRecords({
        quantityByProductId: requestedQtyByProductId,
        note: "Sale from admin order",
        createdBy: req.user._id,
        orderId: order._id,
        createdAt: req.body.createdAt,
      });
      if (sales.length) await Sale.insertMany(sales, { session });

      await order.save({ session });
    });

    await session.endSession();
    await order.populate({
      path: "items.productId",
      select: "-__v -cost",
    });
    res.send(order);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

router.put("/:id/admin", [auth, admin], async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const { error } = validateAdminOrder({
    ...req.body,
    userId: req.body.userId,
  });
  if (error) return res.status(400).send(error.message);

  // Find existing order
  const existingOrder = await Order.findById(req.params.id);
  if (!existingOrder) return res.status(404).send("Order not found.");

  // Prevent updating cancelled or returned orders
  if (
    existingOrder.status === "cancelled" ||
    existingOrder.status === "returned"
  ) {
    return res.status(400).send("Cannot update cancelled or returned orders.");
  }

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

  // Get old order items for stock return
  const oldProductIds = existingOrder.items.map((item) => item.productId);

  // Get new products
  const newProductIds = req.body.items.map((item) => item.productId);

  // Combine all unique product IDs (convert to strings for Set, then back to ObjectIds for query)
  const allUniqueProductIdStrings = new Set([
    ...oldProductIds.map((id) => id.toString()),
    ...newProductIds.map((id) => id.toString()),
  ]);

  const allUniqueProductIds = Array.from(allUniqueProductIdStrings).map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const products = await Product.find({
    _id: { $in: allUniqueProductIds },
  });

  if (products.length !== allUniqueProductIdStrings.size) {
    return res.status(404).send("One or more products not found.");
  }

  // Create a map for easy product lookup
  const productMap = {};
  for (const product of products) {
    productMap[product._id.toString()] = product;
  }

  // Build map of old quantities for comparison
  const oldQtyByProductId = {};
  for (const item of existingOrder.items) {
    oldQtyByProductId[item.productId.toString()] = item.quantity;
  }

  // Calculate stock changes: positive = return stock, negative = reduce stock
  const stockChanges = {};
  const outOfStockProducts = [];
  let totalAmount = 0;

  // Process new order items and calculate stock changes
  for (const item of req.body.items) {
    const productId = item.productId.toString();
    const requestedQty = requestedQtyByProductId[productId];
    const oldQty = oldQtyByProductId[productId] || 0;
    const product = productMap[productId];
    if (!product) continue;

    // Calculate available stock: current stock + quantity being returned from old order
    const availableStock = product.numberInStock + oldQty;

    if (requestedQty > availableStock) {
      outOfStockProducts.push({
        productId: product._id,
        numberInStock: availableStock,
      });
    }

    // Net stock change: oldQty (being returned) - requestedQty (needed)
    stockChanges[productId] = oldQty - requestedQty;

    totalAmount +=
      getDiscountedPrice(
        product.price,
        requestedDiscountByProductId[productId.toString()] || 0
      ) * requestedQty;
  }

  // Handle products that were removed from order (return their stock)
  for (const productId in oldQtyByProductId) {
    if (!requestedQtyByProductId[productId]) {
      // Product was removed, return all its stock
      stockChanges[productId] = oldQtyByProductId[productId];
    }
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
    // Update existing order
    existingOrder.userId = req.body.userId;
    existingOrder.checkoutId = req.body.checkoutId;
    existingOrder.status = req.body.status || existingOrder.status;
    existingOrder.items = req.body.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      discount: item.discount || 0,
    }));
    existingOrder.paymentMethod = req.body.paymentMethod;
    existingOrder.orderInstructions = req.body.orderInstructions;
    existingOrder.shippingFee = shippingFee;
    existingOrder.totalAmount = totalAmount;
    if (req.body.createdAt) existingOrder.createdAt = req.body.createdAt;
    if (req.body.deliveredAt) existingOrder.deliveredAt = req.body.deliveredAt;

    await session.withTransaction(async () => {
      for (const productId in stockChanges) {
        const product = productMap[productId];
        if (product) {
          const stockDelta = stockChanges[productId];
          product.numberInStock += stockDelta;
          product.soldCount = Math.max(
            0,
            (product.soldCount || 0) - stockDelta
          );
          await product.save({ session });
        }
      }

      await Sale.deleteMany(
        { orderId: existingOrder._id, source: "order" },
        { session }
      );
      const sales = buildOrderSaleRecords({
        quantityByProductId: requestedQtyByProductId,
        note: "Sale from admin order",
        createdBy: req.user._id,
        orderId: existingOrder._id,
        createdAt: req.body.createdAt,
      });
      if (sales.length) await Sale.insertMany(sales, { session });

      await existingOrder.save({ session });
    });

    await session.endSession();
    await existingOrder.populate({
      path: "items.productId",
      select: "-__v -cost",
    });
    await existingOrder.populate({
      path: "userId",
      select: "-__v",
    });
    res.send(existingOrder);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

router.patch("/:id/complete", [auth, admin], async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findOne({
    _id: req.params.id,
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
        product.soldCount = Math.max(0, (product.soldCount || 0) - quantity);
        await product.save({ session });
      }
      await Sale.deleteMany(
        { orderId: order._id, source: "order" },
        { session }
      );

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

  const orderReturnExpiry = new Date(
    new Date(order.createdAt).getTime() + 2 * 24 * 60 * 60 * 1000
  );
  if (new Date() > orderReturnExpiry)
    return res
      .status(400)
      .send(
        "Return period has expired. Returns are only allowed within 2 days of delivering the order."
      );

  const { error } = validateReason(req.body);
  if (error) return res.status(400).send(error.message);

  order.status = "returnPending";
  order.returnReason = req.body.reason;
  await order.save();

  res.send(order);
});

router.patch("/:id/confirm-return", [auth, admin], async (req, res) => {
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
        product.soldCount = Math.max(0, (product.soldCount || 0) - quantity);
        await product.save({ session });
      }
      await Sale.deleteMany(
        { orderId: order._id, source: "order" },
        { session }
      );

      await order.save({ session });
    });

    await session.endSession();
    res.sendStatus(204);
  } catch (err) {
    await session.endSession();
    throw err;
  }
});

router.delete("/:id", [auth, admin], async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(404).send("Order not found.");

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).send("Order not found.");

  const statusesNeedingStockReturn = ["onTheWay", "delivered", "returnPending"];
  const shouldReturnStock = statusesNeedingStockReturn.includes(order.status);

  if (shouldReturnStock) {
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
      await session.withTransaction(async () => {
        for (const product of products) {
          const quantity = quantityByProductId[product._id.toString()];
          product.numberInStock += quantity;
          product.soldCount = Math.max(0, (product.soldCount || 0) - quantity);
          await product.save({ session });
        }
        await Sale.deleteMany(
          { orderId: order._id, source: "order" },
          { session }
        );

        if (order.checkoutId) {
          await Checkout.deleteOne({ _id: order.checkoutId }, { session });
        }

        await Order.deleteOne({ _id: order._id }, { session });
      });

      await session.endSession();
      res.sendStatus(204);
    } catch (err) {
      await session.endSession();
      throw err;
    }
  } else {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await Sale.deleteMany(
          { orderId: order._id, source: "order" },
          { session }
        );

        if (order.checkoutId) {
          await Checkout.deleteOne({ _id: order.checkoutId }, { session });
        }

        await Order.deleteOne({ _id: order._id }, { session });
      });

      await session.endSession();
      res.sendStatus(204);
    } catch (err) {
      await session.endSession();
      throw err;
    }
  }
});

module.exports = router;
