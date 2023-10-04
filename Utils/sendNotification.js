const PhaseNotificationModel = require("../Models/PhaseNotification");
const admin = require("firebase-admin");
const serviceAccount = require("../uk-immigration-96842-firebase-adminsdk-3ad66-4fe25cf428.json");
const UserModel = require("../Models/UserModel");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

const sendNotification = async(req,res)=>{
    try {
      const {
        title,
        image,
        userId,
        applicationId,
        fcmToken,
        notificationType,
      } = req.body;
      await new PhaseNotificationModel({
        title: title,
        userId: userId,
        applicationId: applicationId,
        notificationType,
      }).save();

      const user = await UserModel.findById(userId);
      // const fcmToken = user.fcmToken;
      if (!fcmToken) {
        return res.status(422).json({
          data: "Invalid receiverId or token.",
          success: false,
        });
      }

      let newData = "Data to be passed";
      const stringData = JSON.stringify(newData);
      console.log(stringData);

      const message = {
        notification: {
          title: "New Notification",
          body: title,
          image: image
        },
        data: {
          data: stringData,
        },
        token: fcmToken,
      };

      // Send the message
      messaging
        .send(message)
        .then((response) => {
          console.log("Successfully sent notification.", response);         
          return res.status(200).json({
            message: "Notification Sent",
            success: true,
            response,
          });
        })
        .catch((error) => {
          console.error("Error sending message:", error);
          return res
            .status(500)
            .json({ message: "Error sending message", success: false });
        });
    } catch (err) {
        console.log(err);
    }
}

module.exports = {sendNotification}