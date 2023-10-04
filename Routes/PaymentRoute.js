const express = require("express");
const { payWithCard, payWithCardCompanyClient } = require("../Controllers/PaymentController");
const router = express.Router();
const Authenticate = require("../Middlewares/Auth/Auth");

router.post("/api/payment", Authenticate,payWithCard);
router.post("/api/company/payment", Authenticate, payWithCardCompanyClient);

module.exports = router;