const express = require('express');
const Authenticate = require('../Middlewares/Auth/Auth');
const { isAdmin } = require("../Middlewares/Auth/role");
const { createCaseWorker, getCaseWorker, filterCaseWorker } = require('../Controllers/CaseWorkerController');
const router = express.Router();

router.post("/api/caseworker", Authenticate, isAdmin,createCaseWorker);
router.get("/api/caseworker", Authenticate,getCaseWorker);
router.post("/api/caseworker/search", Authenticate, filterCaseWorker);

module.exports = router;