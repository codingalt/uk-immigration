const express = require('express');
const Authenticate = require('../Middlewares/Auth/Auth');
const { getPhaseNotifications, getClientNotifications, readNotification, getNotificationCount } = require('../Controllers/PhaseNotification');
const { sendNotification } = require('../Utils/sendNotification');
const router = express.Router();

router.get("/api/phases/notification", Authenticate, getPhaseNotifications);
router.get("/api/notification", Authenticate, getClientNotifications);
router.post("/api/notification", Authenticate, sendNotification);
router.put("/api/notification/read", Authenticate, readNotification);
router.get("/api/notification/count", Authenticate, getNotificationCount);

module.exports = router;