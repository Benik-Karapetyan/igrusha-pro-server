const { startOfDay, startOfMonth, endOfDay } = require("date-fns");
const { Order } = require("../../models/order");

const getOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  let statuses = req.query.statuses
    ? Array.isArray(req.query.statuses)
      ? req.query.statuses
      : [req.query.statuses]
    : [];

  const fromDate = req.query.from
    ? startOfDay(new Date(req.query.from))
    : startOfDay(startOfMonth(new Date()));

  const toDate = req.query.to
    ? endOfDay(new Date(req.query.to))
    : endOfDay(new Date());

  const query = {};

  if (statuses.length) {
    query.status = { $in: statuses };
  }
  query.createdAt = { $gte: fromDate, $lte: toDate };

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .select("-__v")
    .populate({
      path: "userId",
      select: "-__v",
    })
    .populate({
      path: "items.productId",
      select: "-__v -discount -cost",
      populate: [{ path: "categories", select: "-__v" }],
    });
  for (const order of orders) {
    for (const item of order.items) {
      if (item.productId) {
        item.productId.discount = item.discount;
      }
    }
  }
  const totalRecords = await Order.countDocuments(query);
  const totalAmountResult = await Order.aggregate([
    { $match: { ...query, status: "delivered" } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);
  const totalAmount =
    totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

  res.send({
    items: orders,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
    totalAmount,
  });
};

module.exports = getOrders;
