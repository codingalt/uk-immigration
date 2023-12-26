const express = require("express");
const ChatModel = require("../Models/ChatModel");
const UserModel = require("../Models/UserModel");
const MessageModel = require("../Models/MessageModel");
const ApplicationModel = require("../Models/ApplicationModel");
const CompanyClientModel = require("../Models/CompanyClientModel");

const accessChat = async (req, res) => {
  try {
    const { receiverId, applicationId } = req.body;
    if (!receiverId) {
      return res
        .status(400)
        .json({ message: "UserId cannot be empty", success: false });
    }

    // check if chat is already present
    const chat = await ChatModel.findOne({
      users: { $all: [req.userId.toString(), receiverId] },
    });
    if (chat) {
      return res.status(200).json({
        message: "Chat with this person is already Created",
        success: true,
        chat: chat,
      });
    } else {
      const userData = await UserModel.findOne({ _id: receiverId });
      const newChat = new ChatModel({
        users: [req.userId.toString(), receiverId],
        applicationId: applicationId,
      });
      const result = await newChat.save();
      res.status(200).json({ chat: result, success: true });
    }
  } catch (err) {
    res.status(500).json({ data: err.message, success: false });
  }
};

const createChat = async (req) => {
  try {
    const { applicationId, userId } = req;
    const admin = await UserModel.findOne({ isAdmin: true });
    const adminId = admin._id.toString();

    if (userId === adminId) {
      return { message: "UserId and admin id is same.", success: false };
    }

    // check if chat is already present
    const chat = await ChatModel.findOne({
      users: { $all: [userId, adminId] },
    });

    if (chat) {
      return { message: "Chat with this person already exists", success: true };
    } else {
      if (req.caseWorkerId) {
        let caseWorkerId = req.caseWorkerId;
        const newChat = new ChatModel({
          users: [userId, adminId, caseWorkerId],
          applicationId: applicationId,
          clientId: userId,
        });
        await newChat.save();
        return { message: "Chat Created", success: true };
      } else {
        const newChat = new ChatModel({
          users: [userId, adminId],
          applicationId: applicationId,
          clientId: userId,
        });
        await newChat.save();
        return { message: "Chat Created", success: true };
      }
    }
  } catch (err) {
    res.status(500).json({ data: err.message, success: false });
  }
};

const getUserChats = async (req, res) => {
  try {
    const chats = await ChatModel.find({
      users: { $elemMatch: { $eq: req.userId.toString() } },
    })
      .sort({ updatedAt: -1 })
      .populate({
        path: "users",
        select: "name email profilePic _id googleId",
        match: { _id: { $ne: req.userId.toString() } }, // Exclude the current user
        model: UserModel,
      })
      .exec();

    res.status(200).json({ chats, success: true });
  } catch (err) {
    res.status(500).json({ data: err.message, success: false });
  }
};

const getAllChats = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId.toString());

    if (user.isCaseWorker) {
      const chats = await ChatModel.find({
        users: {
          $elemMatch: {
            $eq: req.userId,
          },
        },
      })
        .sort({ createdAt: -1 })
        .populate({
          path: "users",
          select: "name email profilePic _id googleId",
          match: { _id: { $ne: req.userId.toString() } }, // Exclude the current user
          model: UserModel,
        })
        .exec();

      return res.status(200).json({ chats, success: true, hello: "hello" });
    }

    const chats = await ChatModel.find({})
      .sort({ createdAt: -1 })
      .populate({
        path: "users",
        select: "name email profilePic _id googleId",
        match: { _id: { $ne: req.userId.toString() } }, // Exclude the current user
        model: UserModel,
      })
      .exec();

    res.status(200).json({ chats, success: true });
  } catch (err) {
    res.status(500).json({ data: err.message, success: false });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content, chatId, applicationId } = req.body;
    const files = req.files;
    console.log(files);
    if (!chatId) {
      return res.status(422).json({
        data: "Please fill out all the fields properly!",
        success: false,
      });
    }

    const isCaseWorker = await UserModel.findById(req.userId.toString());
    if (isCaseWorker.isCaseWorker) {
      let application;
      console.log("applicationId", applicationId);
      application = await ApplicationModel.findById(applicationId);
      console.log("before app", application);
      if (!application) {
        application = await CompanyClientModel.findById(applicationId);
      }

      console.log("after app", application);

      if (application.isCaseWorkerHandling) {
        if (application.caseWorkerId != req.userId.toString()) {
          return res
            .status(400)
            .json({
              message: "Action Forbidden! This Case is not assigned to you.",
              success: false,
            });
        }
      } else {
        return res.status(400).json({
          message:
            "Action Forbidden! This Application hasn't been assigned to any case worker.",
          success: false,
        });
      }
    }

    const fileUrls = [];
    if (files) {
      // Handle file uploads
      if (files && files.length > 0) {
        for (const file of files) {
          fileUrls.push(`/Uploads/Chat/${file.filename}`);
        }
      }
    }

    const newMessage = new MessageModel({
      sender: req.userId.toString(),
      content: content,
      chatId: chatId,
      files: fileUrls,
    });
    const result = await newMessage.save();

    // Update Latest Message
    const chat = await ChatModel.findByIdAndUpdate(chatId, {
      latestMessage: content ? content : "Files",
    });

    // Get Sender data
    const sender = await UserModel.findOne({ _id: req.userId.toString() });

    const data = {
      ...result._doc,
      name: sender.name,
      profilePic: sender.profilePic,
    };
    console.log(data);
    var newResult = {
      result: data,
      users: chat?.users,
      //   senderImage: sender.profileImg,
      senderName: sender.name,
    };
    return res.status(200).json({
      result: newResult,
      //   senderImage: sender.profileImg,
      senderName: sender.name,
      success: true,
    });
  } catch (err) {
    res.status(500).json({ data: err.message, success: false });
  }
};

const getAllMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    await MessageModel.updateMany(
      { chatId: chatId },
      { new: true, useFindAndModify: false }
    );

    const result = await MessageModel.find({ chatId });
    // Get Sender Details
    const sender = await UserModel.findOne({ _id: req.userId.toString() });
    res.status(200).json({
      result,
      profilePic: sender.profilePic,
      name: sender.name,
      success: true,
    });
  } catch (err) {
    res.status(500).json({ data: err.message, success: false });
  }
};

const getChatByApplicationId = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const userId = req.userId.toString(); // Assuming req.userId contains the user's ID

    const result = await ChatModel.find({ applicationId: applicationId })
      .populate({
        path: "users",
        model: "Users",
        match: { _id: { $ne: userId } },
        select: "name email profilePic _id googleId",
      })
      .exec();

    const chatData = result.map((chat) => ({
      ...chat._doc,
      users: chat.users.filter((user) => user !== null),
    }));

    res.status(200).json({
      result: chatData,
      success: true,
    });
  } catch (err) {
    res.status(500).json({ data: err.message, success: false });
  }
};

// Get chat notification count
const getChatNotificationCount = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await ChatModel.findById(chatId);
    // const count = await MessageModel.find({
    //   chatId: chatId,
    //   sender: {$ne: req.userId},
    //   isRead: 0,
    // });
    const count = await MessageModel.find({
      chatId: chatId,
      sender: chat.clientId,
      isRead: 0,
    });

    if (count?.length > 0) {
      await ChatModel.updateOne({ _id: chatId }, { unseen: count?.length });
    }

    return res.status(200).json({ count: count?.length, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Get chat notification count
const getUnreadByUserId = async (req, res) => {
  try {
    const chat = await ChatModel.findOne({
      users: {
        $elemMatch: {
          $eq: req.userId,
        },
      },
    });
    console.log("Chat", chat);
    const count = await MessageModel.find({
      chatId: chat?._id,
      isRead: 0,
    });

    return res.status(200).json({ count: count?.length, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Read Messages
const readMessagesByChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log("user Id", req.userId);
    const updated = await MessageModel.updateMany(
      { chatId: chatId, sender: { $ne: req.userId } },
      { $set: { isRead: 1 } },
      { new: true, useFindAndModify: false }
    );

    await ChatModel.updateOne({ _id: chatId }, { unseen: 0 });

    return res.status(200).json({ message: "Messages Seen.", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

module.exports = {
  accessChat,
  getUserChats,
  sendMessage,
  getAllMessages,
  createChat,
  getChatByApplicationId,
  getAllChats,
  getChatNotificationCount,
  readMessagesByChat,
  getUnreadByUserId,
};
