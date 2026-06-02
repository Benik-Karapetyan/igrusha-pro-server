const { Order } = require("../models/order");

const WELCOME_DISCOUNT_PERCENT = 20;

const WELCOME_DISCOUNT_QUALIFYING_STATUSES = [
  "onTheWay",
  "delivered",
  "returnPending",
];

const hasUsedWelcomeDiscount = async (userId, session = null) => {
  if (!userId) return false;

  const query = Order.exists({
    userId,
    status: { $in: WELCOME_DISCOUNT_QUALIFYING_STATUSES },
  });
  if (session) query.session(session);

  return Boolean(await query);
};

module.exports = {
  hasUsedWelcomeDiscount,
  WELCOME_DISCOUNT_PERCENT,
  WELCOME_DISCOUNT_QUALIFYING_STATUSES,
};
