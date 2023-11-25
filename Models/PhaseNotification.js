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
    phase: {
      type: Number,
    },
    phaseStatus: {
      type: String,
    },
    requestStatus: {
      type: Number,
      default: 0,
    },
    redirect: {
      type: String,
    },
    applicationId: {
      type: String,
      required: true,
    },
    caseWorkerId: {
      type: String,
    },
    notificationType: {
      type: String,
      enum: ["admin", "client"],
    },
    status: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const PhaseNotificationModel = mongoose.model("PhaseNotification", phaseNotificationSchema);
module.exports = PhaseNotificationModel;
