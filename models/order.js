const Joi = require("joi");
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  checkoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Checkout",
    required: true,
  },
  orderNumber: {
    type: String,
    unique: true,
  },
  status: {
    type: String,
    enum: ["onTheWay", "delivered", "cancelled", "returnPending", "returned"],
    required: true,
  },
  orderInstructions: {
    type: String,
    max: 1024,
  },
  paymentMethod: {
    type: String,
    enum: ["card", "cash"],
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deliveredAt: {
    type: Date,
  },
  returnedAt: {
    type: Date,
  },
  cancellationReason: {
    type: String,
    max: 1024,
  },
  returnReason: {
    type: String,
    max: 1024,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      discount: {
        type: Number,
      },
    },
  ],
});

orderSchema.pre("save", async function (next) {
  if (!this.orderNumber && this.isNew) {
    const now = this.createdAt || new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateString = `${year}${month}${day}`;

    const ordersCount = await mongoose.model("Order").countDocuments();

    const sequentialNumber = String(ordersCount + 1).padStart(4, "0");
    this.orderNumber = `${dateString}-${sequentialNumber}`;
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);

const validateOrder = (order) => {
  const schema = Joi.object({
    userId: Joi.objectId().required(),
    checkoutId: Joi.objectId().required(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.objectId().required(),
          quantity: Joi.number().integer().min(1).required(),
          discount: Joi.number().optional(),
        })
      )
      .required(),
    paymentMethod: Joi.string().valid("card", "cash").required(),
    orderInstructions: Joi.string().optional().max(1024),
  });

  return schema.validate(order);
};

const validateReason = (reason) => {
  const schema = Joi.object({
    reason: Joi.string().min(10).required(),
  });
  return schema.validate(reason);
};

module.exports = {
  Order,
  validate: validateOrder,
  validateReason: validateReason,
};
