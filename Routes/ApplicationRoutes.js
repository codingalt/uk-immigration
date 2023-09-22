const express = require('express');
const { getApplicationData, updateApplicationData, rejectApplication, filterApplication, approvePhase1, approvePhase2, approvePhase3, requestAPhase, postApplicationPhase1, postApplicationPhase2, postApplicationPhase3, postApplicationPhase4, approvePhase4, getApplicationDataByUser, addNotes, updatePhaseByAdmin, acceptInitialRequest } = require('../Controllers/ApplicationController');
const Authenticate = require('../Middlewares/Auth/Auth');
const { isAdmin } = require('../Middlewares/Auth/role');
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
            const err = new Error('Only Pdf files are allowed.')
            err.name = 'ExtensionError'
            return cb(err);
        }
    },
});

const chalanUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Post Application Data By Client Phase by Phase 
router.post("/api/application/phase1", Authenticate,postApplicationPhase1);
router.post(
  "/api/application/phase2/:applicationId",
  Authenticate,
  applicationUpload.fields([
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
    { name: "other", maxCount: 3 },
  ]),
  postApplicationPhase2
);
router.post("/api/application/phase3/:applicationId", Authenticate,chalanUpload.fields([{name: "chalan", maxCount: 1}]) ,postApplicationPhase3);
router.post("/api/application/phase4/:applicationId", Authenticate, postApplicationPhase4);

router.get("/api/application", Authenticate, getApplicationData);
router.get("/api/application/user", Authenticate, getApplicationDataByUser);
router.put("/api/application", Authenticate, isAdmin,updateApplicationData);
router.put("/api/application/reject", Authenticate, isAdmin,rejectApplication);
router.post("/api/application/search", Authenticate, filterApplication);

// Approve Phases By Admin 
router.post("/api/accept/:applicationId", Authenticate, isAdmin, acceptInitialRequest);
router.post("/api/phase1/approve/:applicationId", Authenticate, isAdmin, approvePhase1);
router.post("/api/phase2/approve/:applicationId", Authenticate, isAdmin, approvePhase2);
router.post("/api/phase3/approve/:applicationId", Authenticate, isAdmin, approvePhase3);
router.post("/api/phase4/approve/:applicationId", Authenticate, isAdmin, approvePhase4);

// Request Phase By Admin 
router.post("/api/phase/request/:applicationId", Authenticate, isAdmin, requestAPhase);

// Add Notes to Application By Admin 
router.post("/api/notes/:applicationId", Authenticate, isAdmin, addNotes);

// Update Application Phase Data By Admin
router.put("/api/phase/update/:applicationId", Authenticate, isAdmin, updatePhaseByAdmin);



module.exports = router;