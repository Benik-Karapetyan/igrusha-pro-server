const winston = require("winston");
require("winston-mongodb");

module.exports = () => {
  winston.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );

  winston.exceptions.handle(
    new winston.transports.Console({ colorize: true, prettyPrint: true }),
    new winston.transports.File({ filename: "uncaughtExceptions.log" })
  );

  winston.exceptions.handle(
    new winston.transports.MongoDB({
      db: "mongodb://localhost:27017/igrusha_pro",
      level: "error",
    })
  );

  winston.add(new winston.transports.File({ filename: "logfile.log" }));

  winston.add(
    new winston.transports.MongoDB({
      db: "mongodb://localhost:27017/igrusha_pro",
      level: "error",
    })
  );
};
