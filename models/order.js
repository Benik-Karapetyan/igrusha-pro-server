const Joi = require("joi");
const mongoose = require("mongoose");
const { AddressSchema, addressJoiSchema } = require("./address");
const { getNextOrderSequence } = require("./counter");

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  checkoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Checkout",
    required: false,
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
  address: {
    type: AddressSchema,
  },
  paymentMethod: {
    type: String,
    enum: ["card", "cash"],
    required: true,
  },
  shippingFee: {
    type: Number,
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

OrderSchema.pre("save", async function (next) {
  if (!this.orderNumber && this.isNew) {
    const now = this.createdAt || new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateString = `${year}${month}${day}`;

    const session = this.$session();
    const sequentialNumber = String(
      await getNextOrderSequence(session)
    ).padStart(4, "0");
    this.orderNumber = `${dateString}-${sequentialNumber}`;
  }
  next();
});

const Order = mongoose.model("Order", OrderSchema);

const validateOrder = (order) => {
  const schema = Joi.object({
    userId: Joi.objectId().required(),
    checkoutId: Joi.objectId().required(),
    paymentMethod: Joi.string().valid("card", "cash").required(),
    orderInstructions: Joi.string().optional().max(1024),
    address: addressJoiSchema.required(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.objectId().required(),
          quantity: Joi.number().integer().min(1).required(),
          discount: Joi.number().allow("").optional(),
        })
      )
      .min(1)
      .required(),
  });

  return schema.validate(order);
};

const validateAdminOrder = (order) => {
  const schema = Joi.object({
    userId: Joi.objectId().required(),
    paymentMethod: Joi.string().valid("card", "cash").required(),
    orderInstructions: Joi.string().optional().max(1024),
    shippingFee: Joi.number().allow("").optional(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.objectId().required(),
          quantity: Joi.number().integer().min(1).required(),
          discount: Joi.number().allow("").optional(),
        })
      )
      .min(1)
      .required(),
    createdAt: Joi.date().allow("").optional(),
  });
  return schema.validate(order);
};

const validateReason = (reason) => {
  const schema = Joi.object({
    reason: Joi.string().min(10).required(),
  });
  return schema.validate(reason);
};

const getDiscountedPrice = (originalPrice, discountPercent) => {
  const discountAmount = (originalPrice * discountPercent) / 100;
  return Number((originalPrice - discountAmount).toFixed(0));
};

const buildOrderSaleRecords = ({
  quantityByProductId,
  note,
  createdBy,
  orderId,
  createdAt,
}) =>
  Object.entries(quantityByProductId)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({
      productId,
      quantity,
      source: "order",
      note,
      createdBy,
      orderId,
      ...(createdAt ? { createdAt } : {}),
    }));

module.exports = {
  Order,
  validate: validateOrder,
  validateAdminOrder,
  validateReason,
  getDiscountedPrice,
  buildOrderSaleRecords,
};
