const express = require('express');
const Authenticate = require('../Middlewares/Auth/Auth');
const { isAdminOrCaseWorker, isAssignedCaseWorker, isAssignedCompanyCaseWorker } = require('../Middlewares/Auth/role');
const {postCompanyClientPhase1, postCompanyClientPhase2, requestCompanyClientPhase, sendRequestToCompanyClient, acceptCompanyInitialRequest, approveCompanyPhase1, approveCompanyPhase2, approveCompanyPhase3, approveCompanyPhase4, postCompanyClientPhase3, postCompanyClientPhase4, getApplicationsByCompanyId, getGroupClientApplicationsById, signupCompanyClient } = require('../Controllers/CompanyClientApplication');
const router = express.Router();
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const applicationUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype == "application/pdf") {
      cb(null, true);
    } else {
      cb(null, false);
      const err = new Error("Only Pdf files are allowed.");
      err.name = "ExtensionError";
      return cb(err);
    }
  },
});

const chalanUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post("/api/companyclient/signup", signupCompanyClient);
router.get("/api/company/applications/:companyId", Authenticate, isAdminOrCaseWorker,getApplicationsByCompanyId)
router.get("/api/company/application/:applicationId", Authenticate, isAdminOrCaseWorker,getGroupClientApplicationsById)
router.post("/api/company/phase1/send", Authenticate, isAdminOrCaseWorker, sendRequestToCompanyClient);
router.post("/api/company/phase/request/:applicationId", Authenticate, isAdminOrCaseWorker, requestCompanyClientPhase);
router.post("/api/company/phase1/:applicationId", Authenticate, postCompanyClientPhase1);
router.post("/api/company/phase2/:applicationId", Authenticate, applicationUpload.fields([
    { name: "passport", maxCount: 1 },
    { name: "dependantPassport", maxCount: 1 },
    { name: "utilityBill", maxCount: 1 },
    { name: "brp", maxCount: 1 },
    { name: "previousVisaVignettes", maxCount: 1 },
    { name: "refusalLetter", maxCount: 1 },
    { name: "educationCertificates", maxCount: 1 },
    { name: "englishLanguageCertificate", maxCount: 1 },
    { name: "marriageCertificate", maxCount: 1 },
    { name: "bankStatements", maxCount: 1 },
    { name: "other", maxCount: 5 },
  ]), postCompanyClientPhase2);
router.post("/api/company/phase3/:applicationId", Authenticate, chalanUpload.fields([{name: "chalan", maxCount: 1}]), postCompanyClientPhase3);
router.post("/api/company/phase4/:applicationId", Authenticate, postCompanyClientPhase4);


// Approve Phases 
router.post("/api/company/accept/:applicationId", Authenticate, isAdminOrCaseWorker, acceptCompanyInitialRequest);
router.post("/api/company/phase1/approve/:applicationId", Authenticate, isAdminOrCaseWorker, isAssignedCompanyCaseWorker, approveCompanyPhase1);
router.post("/api/company/phase2/approve/:applicationId", Authenticate, isAdminOrCaseWorker, isAssignedCompanyCaseWorker, approveCompanyPhase2);
router.post("/api/company/phase3/approve/:applicationId", Authenticate, isAdminOrCaseWorker, isAssignedCompanyCaseWorker, approveCompanyPhase3);
router.post("/api/company/phase4/approve/:applicationId", Authenticate, isAdminOrCaseWorker, isAssignedCompanyCaseWorker, approveCompanyPhase4);

module.exports = router;