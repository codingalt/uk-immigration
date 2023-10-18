const express = require("express");
const ChatModel = require("../Models/ChatModel");
const UserModel = require("../Models/UserModel");
const MessageModel = require("../Models/MessageModel");

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
    const admin = await UserModel.findOne({isAdmin: true});
    const adminId = admin._id.toString();

    if (userId === adminId) {
      return { message: "UserId and admin id is same.", success: false };
    }

    // check if chat is already present
    const chat = await ChatModel.findOne({
      users: { $all: [userId, adminId] },
    });
    
    if (chat) {
      return {message: "Chat with this person already exists", success: true}
    } else {
      const newChat = new ChatModel({
        users: [userId, adminId],
        applicationId: applicationId,
      });
      await newChat.save();
      return {message: "Chat Created", success: true}
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
         select: "name email",
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
    const { content, chatId } = req.body;
    const files = req.files;
    console.log(files);
    if (!chatId) {
      return res
        .status(422)
        .json({
          data: "Please fill out all the fields properly!",
          success: false,
        });
    }

    const fileUrls = [];
    if(files){
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
    var newResult = {
      ...result._doc,
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
    //   senderImage: sender.profileImg,
      senderName: sender.name,
      success: true,
    });
  } catch (err) {
    res.status(500).json({ data: err.message, success: false });
  }
};

module.exports = {
  accessChat,
  getUserChats,
  sendMessage,
  getAllMessages,
  createChat,
};
