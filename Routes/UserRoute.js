const express = require("express");
const { signupUser, verifyEmail, verifyOtp, getAllUsers, loginUser, logoutUser, updateMobileVerify, changePassword, forgotPassword, verifyResetPasswordLink, createNewPassword, updateUserData, AuthRoute, createPaymentIntent, sendmail, verifyCaptcha, getTrackingData } = require("../Controllers/UserController");
const Authenticate = require("../Middlewares/Auth/Auth");
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

const profileUpload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 5MB
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype == "image/jpg" || file.mimetype == "image/png" || file.mimetype == "image/jpeg" || file.mimetype == "image/jfif") {
//       cb(null, true);
//     } else {
//       cb(null, false);
//       const err = new Error("Only Image file is allowed.");
//       err.name = "ExtensionError";
//       return cb(err);
//     }
//   },
});


router.get("/api/auth", AuthRoute);
router.post("/api/signup", signupUser);
router.post("/api/login", loginUser);
router.put("/api/:id/verify/:token", verifyEmail);
router.post("/api/otp/verify", verifyOtp);
router.get("/api/users", Authenticate, isAdminOrCaseWorker,getAllUsers);
router.put("/api/changepassword", Authenticate, changePassword);
router.post("/api/logout", logoutUser);
router.post("/api/verify/contact", Authenticate,updateMobileVerify);
router.post("/api/user/update", Authenticate, profileUpload.fields([{name: "profilePic", maxCount: 1}]), updateUserData);

// Forgot Password 
router.post("/api/forgot-password", Authenticate, forgotPassword);
router.post("/api/reset-password/:id/:token", Authenticate, verifyResetPasswordLink);
router.post("/api/new-password", Authenticate, createNewPassword);

// Stripe Payment Client Secret 
router.post("/api/payment-intent", Authenticate,createPaymentIntent)

router.post("/api/sendmail", sendmail);
router.post("/api/verify-captcha", verifyCaptcha)


router.get("/api/proxy", getTrackingData);

module.exports = router;