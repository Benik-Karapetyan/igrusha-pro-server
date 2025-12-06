const express = require("express");
const cors = require("cors");
const auth = require("../routes/auth");
const users = require("../routes/users");
const products = require("../routes/products");
const favorites = require("../routes/favorites");
const carts = require("../routes/carts");
const genres = require("../routes/genres");
const customers = require("../routes/customers");
const movies = require("../routes/movies");
const rentals = require("../routes/rentals");
const uploads = require("../routes/uploads");
const error = require("../middleware/error");

module.exports = (app) => {
  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        "http://localhost:5200",
        "http://localhost:5201",
        "https://igrusha-pro-web.vercel.app",
        "https://igrusha-pro-backoffice.vercel.app",
      ],
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
  app.use("/api/products", products);
  app.use("/api/favorites", favorites);
  app.use("/api/carts", carts);
  app.use("/api/genres", genres);
  app.use("/api/customers", customers);
  app.use("/api/movies", movies);
  app.use("/api/rentals", rentals);
  app.use("/api/uploads", uploads);
  app.use(error);
};
