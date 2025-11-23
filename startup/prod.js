const helmet = require("helmet");
const compression = require("compression");

module.exports = (app) => {
  // Configure helmet to work with CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(compression());
};
