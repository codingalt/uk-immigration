const PhaseNotificationModel = require("../Models/PhaseNotification");
const admin = require("firebase-admin");
const serviceAccount = require("../uk-immigration-96842-firebase-adminsdk-3ad66-4fe25cf428.json");
const UserModel = require("../Models/UserModel");
const CaseWorkerNotificationModel = require("../Models/CaseWorkerNotificationModel");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

const sendNotification = async(req)=>{
    try {
      const {
        title,
        userId,
        applicationId,
        notificationType,
        phase,
        phaseStatus,
        phaseSubmittedByClient,
      } = req;

      await new PhaseNotificationModel({
        title: title,
        userId: userId,
        applicationId: applicationId,
        phase: phase,
        phaseStatus: phaseStatus,
        notificationType,
        phaseSubmittedByClient: phaseSubmittedByClient,
        reSubmit: req.reSubmit && req.reSubmit,
        finalConfirmation: req.finalConfirmation && req.finalConfirmation,
      }).save();

      const user = await UserModel.findById(userId);
      const fcmToken = user.fcmToken[user.fcmToken.length - 1];
    
      if (!fcmToken) {
        return {
          data: "Invalid receiverId or token.",
          success: false,
        };
      }

      let newData = "Data to be passed";
      const stringData = JSON.stringify(newData);

      const message = {
        notification: {
          title: "Notification",
          body: title,
        },
        data: {
          data: stringData,
        },
        token: fcmToken,
      };

      // Send the message
      // messaging
      //   .send(message)
      //   .then((response) => {
      //     console.log("Successfully sent notification.", response);         
      //     return {
      //       message: "Notification Sent",
      //       success: true,
      //       response,
      //     }
      //   })
      //   .catch((error) => {
      //     console.error("Error sending message:", error);
      //     return { message: "Error sending Notification", success: false }
      //   });
    } catch (err) {
        console.log(err);
    }
}

const sendNotificationToCaseWorker = async (req) => {
  try {
    const {
      title,
      userId,
      applicationId,
      notificationType,
      phase,
      phaseStatus,
      caseWorkerId
    } = req;

    await new CaseWorkerNotificationModel({
      title: title,
      userId: userId,
      applicationId: applicationId,
      phase: phase,
      phaseStatus: phaseStatus,
      notificationType,
      caseWorkerId: caseWorkerId,
    }).save();

  } catch (err) {
    console.log(err);
  }
};

module.exports = { sendNotification, sendNotificationToCaseWorker};