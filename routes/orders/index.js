const router = require("express").Router();
const auth = require("../../middleware/auth");
const admin = require("../../middleware/admin");
const getOrders = require("./getOrders");
const getUserOrders = require("./getUserOrders");
const getOrderById = require("./getOrderById");
const createOrder = require("./createOrder");
const createOrderAdmin = require("./createOrderAdmin");
const updateOrderAdmin = require("./updateOrderAdmin");
const completeOrder = require("./completeOrder");
const cancelOrder = require("./cancelOrder");
const returnOrder = require("./returnOrder");
const confirmReturnOrder = require("./confirmReturnOrder");
const deleteOrder = require("./deleteOrder");
const getOrderPaymentStatus = require("./getOrderPaymentStatus");
const completeOrderPayment = require("./completeOrderPayment");

router.get("/", auth, getOrders);

router.get("/user/:id", auth, getUserOrders);

router.get("/:id", auth, getOrderById);

router.post("/", auth, createOrder);

router.post("/admin", [auth, admin], createOrderAdmin);

router.put("/:id/admin", [auth, admin], updateOrderAdmin);

router.patch("/:id/complete", [auth, admin], completeOrder);

router.patch("/:id/cancel", auth, cancelOrder);

router.patch("/:id/return", auth, returnOrder);

router.patch("/:id/confirm-return", [auth, admin], confirmReturnOrder);

router.get("/:id/payment-status", auth, getOrderPaymentStatus);

router.post("/:id/complete-payment", auth, completeOrderPayment);

router.delete("/:id", [auth, admin], deleteOrder);

module.exports = router;
