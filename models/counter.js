const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { versionKey: false }
);

const Counter =
  mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

const getNextSequence = async (counterId, getInitialSequence, session) => {
  let counter = await Counter.findById(counterId).session(session);

  if (!counter) {
    const initialSequence = await getInitialSequence();

    try {
      await Counter.create(
        [
          {
            _id: counterId,
            seq: initialSequence,
          },
        ],
        { session }
      );
    } catch (err) {
      if (err?.code !== 11000) {
        throw err;
      }
    }
  }

  counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true }
  ).session(session);

  return counter.seq;
};

const getMaxExistingSequence = async (modelName, numberField, session) => {
  const sequenceField = "__sequencePart";

  const [result] = await mongoose
    .model(modelName)
    .aggregate([
      {
        $match: {
          [numberField]: { $type: "string" },
        },
      },
      {
        $project: {
          [sequenceField]: {
            $arrayElemAt: [{ $split: [`$${numberField}`, "-"] }, 1],
          },
        },
      },
      {
        $match: {
          [sequenceField]: { $regex: "^[0-9]+$" },
        },
      },
      {
        $project: {
          sequence: { $toInt: `$${sequenceField}` },
        },
      },
      {
        $group: {
          _id: null,
          maxSequence: { $max: "$sequence" },
        },
      },
    ])
    .session(session);

  return result?.maxSequence || 0;
};

const getMaxExistingProductSequence = async (session) => {
  return getMaxExistingSequence("Product", "productNumber", session);
};

const getNextProductSequence = async (session) => {
  return getNextSequence(
    "productNumber",
    () => getMaxExistingProductSequence(session),
    session
  );
};

const getMaxExistingOrderSequence = async (session) => {
  return getMaxExistingSequence("Order", "orderNumber", session);
};

const getNextOrderSequence = async (session) => {
  return getNextSequence(
    "orderNumber",
    () => getMaxExistingOrderSequence(session),
    session
  );
};

module.exports = {
  Counter,
  getNextProductSequence,
  getNextOrderSequence,
};
