const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    isPhaseApprovedMessage: {
      type: Boolean,
    },
    isPhaseRejectMessage: {
      type: Boolean,
    },
    redirect: {
      type: String,
    },
    isRead: {
      type: Number,
      default: 0,
    },
    isPhaseMessage: Boolean,
    files: [],
  },
  { timestamps: true }
);

const MessageModel = mongoose.model("Message", messageSchema);
module.exports = MessageModel;
