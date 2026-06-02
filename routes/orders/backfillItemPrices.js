const { Order } = require("../../models/order");
const { Product } = require("../../models/product");

// TEMPORARY one-off migration endpoint.
// Backfills order item `price` using the CURRENT product price for any item
// that has no price yet. Note: this is today's price, not the true at-order
// price. Remove this route and file once the backfill has been run.
const backfillItemPrices = async (req, res) => {
  const orders = await Order.find({ "items.price": { $exists: false } });

  const productIds = [
    ...new Set(
      orders.flatMap((order) =>
        order.items.map((item) => item.productId?.toString()).filter(Boolean)
      )
    ),
  ];

  const products = await Product.find({ _id: { $in: productIds } }).select(
    "price"
  );
  const priceById = new Map(
    products.map((product) => [product._id.toString(), product.price])
  );

  let updatedOrders = 0;
  let updatedItems = 0;
  let skippedItems = 0;

  for (const order of orders) {
    const set = {};

    order.items.forEach((item, index) => {
      if (item.price != null) return;

      const price = priceById.get(item.productId?.toString());
      if (price == null) {
        skippedItems += 1;
        return;
      }

      set[`items.${index}.price`] = price;
      updatedItems += 1;
    });

    if (Object.keys(set).length > 0) {
      await Order.updateOne({ _id: order._id }, { $set: set });
      updatedOrders += 1;
    }
  }

  res.send({
    matchedOrders: orders.length,
    updatedOrders,
    updatedItems,
    skippedItems,
  });
};

module.exports = backfillItemPrices;
