const Joi = require("joi");
const mongoose = require("mongoose");
const { genreSchema } = require("./genre");

const Movie = mongoose.model(
  "Movie",
  new mongoose.Schema({
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
    },
    numberInStock: { type: Number, required: true, min: 0 },
    dailyRentalRate: { type: Number, required: true, min: 0 },
    genre: { type: genreSchema, required: true },
  })
);

const validateMovie = (movie) => {
  const schema = Joi.object({
    title: Joi.string().min(5).max(100).required(),
    numberInStock: Joi.number().min(0).required(),
    dailyRentalRate: Joi.number().min(0).required(),
    genreId: Joi.objectId().required(),
  });

  return schema.validate(movie);
};

module.exports = { Movie, validate: validateMovie };
