const express = require('express');
const Authenticate = require('../Middlewares/Auth/Auth');
const { getPhaseNotifications, getClientNotifications, readNotification, getNotificationCount, getNotificationCountAdmin, readNotificationAdmin, getNotificationCountCaseWorker, readNotificationCaseWorker } = require('../Controllers/PhaseNotification');
const { sendNotification } = require('../Utils/sendNotification');
const { isAdminOrCaseWorker } = require('../Middlewares/Auth/role');
const router = express.Router();

router.get("/api/phases/notification", Authenticate, getPhaseNotifications);
router.get("/api/notification", Authenticate, getClientNotifications);
router.post("/api/notification", Authenticate, sendNotification);
router.put("/api/notification/read/user", Authenticate, readNotification);
router.put(
  "/api/notification/read/admin",
  Authenticate,
  isAdminOrCaseWorker,
  readNotificationAdmin
);
router.get("/api/notification/count", Authenticate, getNotificationCount);
router.get("/api/notification/count/admin", Authenticate,isAdminOrCaseWorker, getNotificationCountAdmin);
router.get("/api/notification/count/caseworker", Authenticate,isAdminOrCaseWorker, getNotificationCountCaseWorker);
router.put(
  "/api/notification/read/caseworker",
  Authenticate,
  isAdminOrCaseWorker,
  readNotificationCaseWorker
);

module.exports = router;