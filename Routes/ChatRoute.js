const express = require("express");
const Authenticate = require("../Middlewares/Auth/Auth");
const { accessChat, getUserChats, sendMessage, getAllMessages, getChatByApplicationId } = require("../Controllers/ChatController");
const multer = require("multer");
const { isAssignedCaseWorker } = require("../Middlewares/Auth/role");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Uploads/Chat"); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); 
  },
});

const upload = multer({ storage: storage });

router.post("/api/chat", Authenticate, accessChat);
router.get("/api/chats", Authenticate, getUserChats);
router.get("/api/chat/:applicationId", Authenticate, getChatByApplicationId);
router.post("/api/message", Authenticate,upload.array('chatFile',5), isAssignedCaseWorker, sendMessage);
router.get("/api/message/:chatId", Authenticate, getAllMessages);

module.exports = router;
