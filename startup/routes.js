const express = require("express");
const cors = require("cors");
const genres = require("../routes/genres");
const customers = require("../routes/customers");
const movies = require("../routes/movies");
const rentals = require("../routes/rentals");
const users = require("../routes/users");
const auth = require("../routes/auth");
const error = require("../middleware/error");

module.exports = (app) => {
  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
          "http://localhost:3000",
          "http://localhost:5173",
          "http://localhost:5174",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:5173",
          "https://igrusha-pro.vercel.app",
        ];

        if (
          allowedOrigins.indexOf(origin) !== -1 ||
          origin.includes("localhost") ||
          origin.includes("127.0.0.1")
        ) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all for now - change to callback(new Error('Not allowed by CORS')) for production
        }
      },
      credentials: true,
      exposedHeaders: ["x-auth-token"],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static("public"));
  app.use("/api/genres", genres);
  app.use("/api/customers", customers);
  app.use("/api/movies", movies);
  app.use("/api/rentals", rentals);
  app.use("/api/users", users);
  app.use("/api/auth", auth);
  app.use(error);
};
