const mongoose = require("mongoose");

const phaseNotificationSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    userId: {
      type: String,
      required: true,
    },
    applicationId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const PhaseNotificationModel = mongoose.model("PhaseNotification", phaseNotificationSchema);
module.exports = PhaseNotificationModel;
