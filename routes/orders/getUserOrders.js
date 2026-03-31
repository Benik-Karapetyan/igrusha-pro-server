const { Order } = require("../../models/order");

const getUserOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;

  const orders = await Order.find({ userId: req.params.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .select("-__v")
    .populate({
      path: "items.productId",
      select: "-__v -discount -cost",
      populate: { path: "categories", select: "-__v" },
    });
  for (const order of orders) {
    for (const item of order.items) {
      if (item.productId) {
        item.productId.discount = item.discount;
      }
    }
  }
  const totalRecords = await Order.countDocuments({ userId: req.params.id });

  res.send({
    items: orders,
    totalPages: Math.ceil(totalRecords / pageSize),
    totalRecords,
  });
};

module.exports = getUserOrders;
