const config = require("config");
const mongoose = require("mongoose");
const {
  Order,
  validateAdminOrder,
  getDiscountedPrice,
  buildOrderSaleRecords,
} = require("../../models/order");
const { Product } = require("../../models/product");
const { Sale } = require("../../models/sale");

const updateOrderAdmin = async (req, res) => {
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
};

module.exports = updateOrderAdmin;
