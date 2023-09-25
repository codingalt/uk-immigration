const mongoose = require("mongoose");

const phaseNotificationSchema = mongoose.Schema(
  {
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
