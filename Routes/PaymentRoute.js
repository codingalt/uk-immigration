const express = require("express");
const { payWithCard } = require("../Controllers/PaymentController");
const router = express.Router();
const Authenticate = require("../Middlewares/Auth/Auth");

router.post("/api/payment", payWithCard);

module.exports = router;