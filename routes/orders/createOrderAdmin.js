const config = require("config");
const mongoose = require("mongoose");
const {
  Order,
  validateAdminOrder,
  getDiscountedPrice,
  buildOrderSaleRecords,
} = require("../../models/order");
const { Address } = require("../../models/address");
const { Product } = require("../../models/product");
const { Sale } = require("../../models/sale");

const createOrderAdmin = async (req, res) => {
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
    const effectiveCreatedAt = req.body.createdAt
      ? new Date(req.body.createdAt)
      : new Date();

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
      createdAt: effectiveCreatedAt,
      deliveredAt: effectiveCreatedAt,
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
};

module.exports = createOrderAdmin;
