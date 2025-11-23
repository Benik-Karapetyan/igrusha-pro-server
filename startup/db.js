const mongoose = require("mongoose");
const winston = require("winston");

module.exports = () => {
  mongoose
    .connect(
      "mongodb+srv://benikkarapetyan:SOHrNgfZozVTdKqP@cluster0.7tueots.mongodb.net/?appName=Cluster0/igrusha_pro"
    )
    .then(() => {
      winston.info("Connected to MongoDB...");
    });
};
