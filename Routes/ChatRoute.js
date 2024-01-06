const express = require("express");
const Authenticate = require("../Middlewares/Auth/Auth");
const { accessChat, getUserChats, sendMessage, getAllMessages, getChatByApplicationId, getAllChats, getChatNotificationCount, readMessagesByChat, getUnreadByUserId, createCaseWorkerChat } = require("../Controllers/ChatController");
const multer = require("multer");
const { isAssignedCaseWorker, isAdminOrCaseWorker } = require("../Middlewares/Auth/role");

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
router.post("/api/message", Authenticate,upload.array('chatFile',5), sendMessage);
router.get("/api/message/:chatId", Authenticate, getAllMessages);
router.get("/api/chats/all", Authenticate, isAdminOrCaseWorker,getAllChats);
// router.get("/api/chat/unseen/count/:chatId", Authenticate, isAdminOrCaseWorker, getChatNotificationCount);
// router.get("/api/chat/read/:chatId", Authenticate, readMessagesByChat);
router.get("/api/chat/unread/count", Authenticate, getUnreadByUserId);

router.post("/api/chat/read/:chatId", Authenticate, readMessagesByChat);

router.post("/api/chat/unseen/count/:chatId", Authenticate, getChatNotificationCount);

// Create Chat between Case Workers 
router.post("/api/create/chat/caseworker", Authenticate, createCaseWorkerChat);

module.exports = router;
