const express = require("express");
const Authenticate = require("../Middlewares/Auth/Auth");
const { isAdminOrCaseWorker } = require("../Middlewares/Auth/role");
const { addEvent, getEvent } = require("../Controllers/EventController");
const router = express.Router();

router.post("/api/event", Authenticate,isAdminOrCaseWorker,addEvent);
router.get("/api/events", Authenticate, isAdminOrCaseWorker, getEvent);

module.exports = router;