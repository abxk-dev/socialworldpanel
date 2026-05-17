const express = require("express");
const { wrap } = require("../lib/wrapHandler");

const servicesIndex = require("../lib/handlers/services/index");
const categories = require("../lib/handlers/services/categories");
const categoriesWithServices = require("../lib/handlers/services/categories-with-services");

const router = express.Router();

router.get("/", wrap(servicesIndex));
router.get("/categories", wrap(categories));
router.get("/categories-with-services", wrap(categoriesWithServices));

module.exports = router;
