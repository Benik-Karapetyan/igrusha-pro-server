const router = require("express").Router();
const auth = require("../../middleware/auth");
const admin = require("../../middleware/admin");
const getProducts = require("./getProducts");
const getProductsBackOffice = require("./getProductsBackOffice");
const getProductVariants = require("./getProductVariants");
const getRelatedProductsSingle = require("./getRelatedProductsSingle");
const getRelatedProductsMultiple = require("./getRelatedProductsMultiple");
const getProductMeta = require("./getProductMeta");
const getProductByUrlName = require("./getProductByUrlName");
const getProductById = require("./getProductById");
const createProduct = require("./createProduct");
const updateProduct = require("./updateProduct");
const publishProduct = require("./publishProduct");
const deleteProduct = require("./deleteProduct");
const generateProductContent = require("./generateProductContent");

router.get("/", getProducts);

router.get("/back-office", [auth, admin], getProductsBackOffice);

router.get("/:id/variants", getProductVariants);

router.get("/:id/related", getRelatedProductsSingle);

router.get("/related", getRelatedProductsMultiple);

router.get("/:urlName/meta", getProductMeta);

router.get("/:urlName", getProductByUrlName);

router.get("/by-id/:id", getProductById);

router.post("/", [auth, admin], createProduct);

router.post("/:id/generate-content", [auth, admin], generateProductContent);

router.put("/:id", [auth, admin], updateProduct);

router.patch("/:id/publish", [auth, admin], publishProduct);

router.delete("/:id", [auth, admin], deleteProduct);

module.exports = router;
