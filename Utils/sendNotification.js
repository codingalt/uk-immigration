const PhaseNotificationModel = require("../Models/PhaseNotification");

const sendNotification = async(request)=>{
    try {
        
      const notification = await new PhaseNotificationModel({
        title: request.title,
        userId: request.userId,
        applicationId: request.applicationId,
      }).save(); 
        
    } catch (err) {
        console.log(err);
    }
}

module.exports = {sendNotification}