const mongoose = require("mongoose");

const emailTokenSchema = mongoose.Schema(
  {
    userId: {
        type: String,
        required: true,
        ref: "User",
    },
    otp: {
      type: String,
      required: true,
    },
    token: {
        type: String,
        required: true,
    },
    createdAt: {type: Date, default: Date.now(), expires: 900},

  });

  const EmailTokenModel = mongoose.model("emailtoken", emailTokenSchema);
  module.exports = EmailTokenModel;