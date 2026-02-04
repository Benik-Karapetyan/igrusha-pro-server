const express = require("express");
const cors = require("cors");
const auth = require("../routes/auth");
const users = require("../routes/users");
const addresses = require("../routes/addresses");
const categories = require("../routes/categories");
const products = require("../routes/products");
const favorites = require("../routes/favorites");
const carts = require("../routes/carts");
const checkouts = require("../routes/checkouts");
const orders = require("../routes/orders");
const expenses = require("../routes/expenses");
const uploads = require("../routes/uploads");
const error = require("../middleware/error");

module.exports = (app) => {
  const isProduction = process.env.NODE_ENV === "production";

  const allowedOrigins = isProduction
    ? [
        "https://www.igrusha.pro",
        "https://igrusha-pro-web.vercel.app",
        "https://igrusha-pro-backoffice.vercel.app",
      ]
    : [
        "http://localhost:3000",
        "http://localhost:5200",
        "http://localhost:5201",
      ];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      exposedHeaders: ["x-auth-token"],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-auth-token",
        "Accept",
      ],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static("public"));
  app.use("/api/auth", auth);
  app.use("/api/users", users);
  app.use("/api/addresses", addresses);
  app.use("/api/categories", categories);
  app.use("/api/products", products);
  app.use("/api/favorites", favorites);
  app.use("/api/carts", carts);
  app.use("/api/checkouts", checkouts);
  app.use("/api/orders", orders);
  app.use("/api/expenses", expenses);
  app.use("/api/uploads", uploads);
  app.use(error);
};
