const express = require("express");
const { signupUser, verifyEmail, verifyOtp, getAllUsers, loginUser, logoutUser, updateMobileVerify, changePassword } = require("../Controllers/UserController");
const Authenticate = require("../Middlewares/Auth/Auth");
const router = express.Router();

router.post("/api/signup", signupUser);
router.post("/api/login", loginUser);
router.put("/api/:id/verify/:token", verifyEmail);
router.post("/api/otp/verify", verifyOtp);
router.get("/api/users", Authenticate,getAllUsers);
router.put("/api/changepassword", Authenticate, changePassword);
router.get("/api/logout", logoutUser);
router.post("/api/verify/contact", Authenticate,updateMobileVerify);

module.exports = router;