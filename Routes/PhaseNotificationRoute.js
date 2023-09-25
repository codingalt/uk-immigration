const express = require('express');
const Authenticate = require('../Middlewares/Auth/Auth');
const { getPhaseNotifications } = require('../Controllers/PhaseNotification');
const router = express.Router();

router.get("/api/phases/notification", Authenticate, getPhaseNotifications);

module.exports = router;