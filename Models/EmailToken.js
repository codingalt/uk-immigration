const mongoose = require("mongoose");

const emailTokenSchema = mongoose.Schema(
  {
    userId: {
        type: String,
        required: true,
        ref: "User",
    },
    token: {
        type: String,
        required: true,
    },
    createdAt: {type: Date, default: Date.now(), expires: 900},

  });

  const EmailTokenModel = mongoose.model("emailtoken", emailTokenSchema);
  module.exports = EmailTokenModel;