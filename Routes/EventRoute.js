const express = require("express");
const Authenticate = require("../Middlewares/Auth/Auth");
const { isAdminOrCaseWorker } = require("../Middlewares/Auth/role");
const { addEvent, getEvent, getEventByUserId } = require("../Controllers/EventController");
const router = express.Router();

router.post("/api/event", Authenticate,isAdminOrCaseWorker,addEvent);
router.get("/api/events", Authenticate, isAdminOrCaseWorker, getEventByUserId);

module.exports = router;