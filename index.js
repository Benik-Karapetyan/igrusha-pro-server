const winston = require("winston");
const express = require("express");
const app = express();

require("./startup/logging")();
require("./startup/config")();
require("./startup/db")();
require("./startup/routes")(app);
require("./startup/validation")();
require("./startup/prod")(app);

const port = process.env.PORT || 3001;

app.listen(port, () => {
  winston.info(`Server is running on port ${port}...`);
});
