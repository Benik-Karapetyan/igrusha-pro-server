const config = require("config");
const mongoose = require("mongoose");
const omit = require("lodash/omit");
const {
  Order,
  validate,
  getDiscountedPrice,
  buildOrderSaleRecords,
} = require("../../models/order");
const { Checkout } = require("../../models/checkout");
const { Address } = require("../../models/address");
const { Product } = require("../../models/product");
const { Cart } = require("../../models/cart");
const { Sale } = require("../../models/sale");

const createOrder = async (req, res) => {
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
};

module.exports = createOrder;
