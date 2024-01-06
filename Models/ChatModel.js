const mongoose = require("mongoose");

const chatSchema = mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
    ],
    latestMessage: {
      type: String,
    },
    unseen: {
      type: Number,
      default: 0
    },
    applicationId: {
      type: String,
    },
    clientId: {
      type: String,
    },
    caseWorkerChat: {
      type: Boolean
    }
  },
  { timestamps: true }
);

const ChatModel = mongoose.model("Chat", chatSchema);
module.exports = ChatModel;
