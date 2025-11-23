const mongoose = require("mongoose");
const winston = require("winston");

module.exports = () => {
  mongoose.connect("mongodb://localhost:27017/igrusha_pro").then(() => {
    winston.info("Connected to MongoDB...");
  });
};
