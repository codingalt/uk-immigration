const express = require('express');
const Authenticate = require('../Middlewares/Auth/Auth');
const { isAdmin, isAdminOrCaseWorker } = require('../Middlewares/Auth/role');
const { createCompany, getCompanyDetailsByID } = require('../Controllers/Company');
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

const fileUpload = multer({
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


router.post(
  "/api/company",
  Authenticate,
  isAdmin,
  fileUpload.fields([{ name: "engagementLetter", maxCount: 1 }, {name: "terms", maxCount: 1}]),
  createCompany
);

router.get("/api/company/:companyId", Authenticate, isAdminOrCaseWorker, getCompanyDetailsByID);

module.exports = router;