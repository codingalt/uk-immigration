const express = require('express');
const Authenticate = require('../Middlewares/Auth/Auth');
const { getPhaseNotifications, getClientNotifications } = require('../Controllers/PhaseNotification');
const { sendNotification } = require('../Utils/sendNotification');
const router = express.Router();

router.get("/api/phases/notification", Authenticate, getPhaseNotifications);
router.get("/api/notifications", Authenticate, getClientNotifications);
router.post("/api/notification", Authenticate, sendNotification);

module.exports = router;