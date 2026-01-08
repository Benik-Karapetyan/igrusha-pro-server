const cron = require("node-cron");
const { Checkout } = require("../models/checkout");
const winston = require("winston");

module.exports = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const result = await Checkout.updateMany(
        {
          status: "active",
          createdAt: { $lt: twentyFourHoursAgo },
        },
        {
          $set: { status: "abandoned" },
        }
      );

      if (result.modifiedCount > 0) {
        winston.info(`Marked ${result.modifiedCount} checkout(s) as abandoned`);
      }
    } catch (error) {
      winston.error("Error in abandoned checkout cron job:", error);
    }
  });

  winston.info("Cron job for abandoned checkouts is scheduled");
};
