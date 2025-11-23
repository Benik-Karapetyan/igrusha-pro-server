const helmet = require("helmet");
const compression = require("compression");

module.exports = (app) => {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(compression());
};
