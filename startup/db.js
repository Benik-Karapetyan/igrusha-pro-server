const mongoose = require("mongoose");
const winston = require("winston");
const config = require("config");

module.exports = async () => {
  await mongoose.connect(config.get("db"));
  winston.info("Connected to MongoDB...");

  // Drop unique index on phone field to allow duplicates
  try {
    const usersCollection = mongoose.connection.db.collection("users");
    const indexes = await usersCollection.indexes();
    const phoneIndex = indexes.find(
      (index) => index.key && index.key.phone === 1 && index.unique === true
    );

    if (phoneIndex) {
      await usersCollection.dropIndex(phoneIndex.name);
      winston.info("Dropped unique index on phone field");
    }
  } catch (err) {
    // Ignore errors if index doesn't exist or can't be dropped
    if (!err.message.includes("index not found") && err.code !== 27) {
      winston.warn("Could not drop phone index:", err.message);
    }
  }
};
