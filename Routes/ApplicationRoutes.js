const express = require('express');
const { getApplicationData, updateApplicationData, rejectApplication, filterApplication, approvePhase1, approvePhase2, approvePhase3, requestAPhase, postApplicationPhase1, postApplicationPhase2, postApplicationPhase3, postApplicationPhase4, approvePhase4, getApplicationDataByUser, addNotes, updatePhaseByAdmin, acceptInitialRequest, getApplicationDataById, getApplicationByUserId, assignApplicationToCaseWorker, getInvoiceDetails, filterInvoices, linkCompany, requestCompanyClientPhase1, postCharacter, getApplicationNotification, postGeneral, postAccomodation, postFamily, postLanguage, postEducation, postEmployment, postMaintenance, postTravel, postPhase1Manual, updatePhase1Manual, updateApplicationService, arrayFileUploads, getApplicationsNotesData, ReRequestPhase1, ReRequestPhase4 } = require('../Controllers/ApplicationController');
const Authenticate = require('../Middlewares/Auth/Auth');
const { isAdmin, isAdminOrCaseWorker, isAssignedCaseWorker } = require('../Middlewares/Auth/role');
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
  "/api/application/phase2",
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
    { name: "other", maxCount: 5 },
  ]),
  postApplicationPhase2
);

router.post("/api/application/phase3/:applicationId", Authenticate,chalanUpload.fields([{name: "chalan", maxCount: 1}]) ,postApplicationPhase3);
router.post("/api/application/phase4/:applicationId", Authenticate, postApplicationPhase4);
router.post("/api/application/general/:applicationId", Authenticate, postGeneral);
router.post("/api/application/accomodation/:applicationId", Authenticate, postAccomodation);
router.post("/api/application/family/:applicationId", Authenticate, postFamily);
router.post("/api/application/language/:applicationId", Authenticate, postLanguage);
router.post("/api/application/education/:applicationId", Authenticate, postEducation);
router.post("/api/application/employment/:applicationId", Authenticate, postEmployment);
router.post("/api/application/maintenance/:applicationId", Authenticate, postMaintenance);
router.post("/api/application/travel/:applicationId", Authenticate, postTravel);
router.post("/api/application/character/:applicationId", Authenticate, postCharacter);

router.get("/api/application", Authenticate, getApplicationData);
router.get("/api/application/notes/get", Authenticate, isAdminOrCaseWorker, getApplicationsNotesData);
router.get("/api/application/:applicationId", Authenticate, getApplicationDataById);
router.get("/api/user/application", Authenticate, getApplicationByUserId);
router.get("/api/application/user", Authenticate, getApplicationDataByUser);
router.put("/api/application", Authenticate, isAdminOrCaseWorker,isAssignedCaseWorker,updateApplicationData);
router.put("/api/application/reject", Authenticate, isAdminOrCaseWorker, isAssignedCaseWorker, rejectApplication);
router.post("/api/application/search", Authenticate, filterApplication);

// Approve Phases By Admin/Case Worker 
router.post("/api/accept/:applicationId", Authenticate, isAdminOrCaseWorker, acceptInitialRequest);
router.post("/api/phase1/approve/:applicationId", Authenticate, isAdminOrCaseWorker, isAssignedCaseWorker, approvePhase1);
router.post("/api/phase2/approve/:applicationId", Authenticate, isAdminOrCaseWorker,isAssignedCaseWorker, approvePhase2);
router.post("/api/phase3/approve/:applicationId", Authenticate, isAdminOrCaseWorker,isAssignedCaseWorker, approvePhase3);
router.post("/api/phase4/approve/:applicationId", Authenticate, isAdminOrCaseWorker,isAssignedCaseWorker, approvePhase4);

// Request Phase By Admin/Case Worker 
router.post("/api/phase/request/:applicationId", Authenticate, isAdminOrCaseWorker,isAssignedCaseWorker, requestAPhase);

// Add Notes to Application By Admin/Case Worker 
router.post("/api/notes/:applicationId", Authenticate, isAdminOrCaseWorker, isAssignedCaseWorker,addNotes);

// Update Application Phase Data By Admin/Case Worker
router.put("/api/phase/update/:applicationId", Authenticate, isAdminOrCaseWorker, isAssignedCaseWorker, updatePhaseByAdmin);

// Assign Application to Case Worker By Admin
router.post("/api/application/assign", Authenticate, isAdmin, assignApplicationToCaseWorker);

// Get Invoice Details 
router.get("/api/invoice",Authenticate, isAdminOrCaseWorker, getInvoiceDetails);
router.post("/api/invoice/filter",Authenticate, isAdminOrCaseWorker, filterInvoices);

// Link Company with client application 
router.post("/api/company/link/:applicationId",Authenticate, isAdminOrCaseWorker, isAssignedCaseWorker, linkCompany);

// Get Application Notification 
router.get("/api/application/notification", Authenticate, getApplicationNotification);

// Add Application Manual 
router.post("/api/phase1/manual", Authenticate,isAdminOrCaseWorker, postPhase1Manual);
router.put("/api/phase1/manual/:applicationId", Authenticate,isAdminOrCaseWorker, updatePhase1Manual);

// Update Application Service 
router.put("/api/service/:applicationId", Authenticate,isAdminOrCaseWorker, updateApplicationService)

router.post(
  "/api/application/files",
  Authenticate,
  applicationUpload.array("files", 10), // "files" is the field name, 10 is the maximum number of files
  arrayFileUploads
);

// Re Request from admin side to Submit Phase data if rejected by admin 
router.post("/api/rerequest/phase1/:applicationId", Authenticate, isAdminOrCaseWorker, isAssignedCaseWorker, ReRequestPhase1);
router.post("/api/rerequest/phase4/:applicationId", Authenticate, isAdminOrCaseWorker, isAssignedCaseWorker, ReRequestPhase4);

module.exports = router;