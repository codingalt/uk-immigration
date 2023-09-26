const express = require('express');
const Authenticate = require('../Middlewares/Auth/Auth');
const { getPhaseNotifications, getClientNotifications } = require('../Controllers/PhaseNotification');
const router = express.Router();

router.get("/api/phases/notification", Authenticate, getPhaseNotifications);
router.get("/api/notifications", Authenticate, getClientNotifications);

module.exports = router;