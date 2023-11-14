const ApplicationModel = require("../Models/ApplicationModel");
const PhaseNotificationModel = require("../Models/PhaseNotification");

const getPhaseNotifications = async(req,res)=>{
    try {

        const phases = await PhaseNotificationModel.aggregate([
          {
            $addFields: {
              convertedId: { $toObjectId: "$userId" },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "convertedId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $unwind: "$user",
          },
          {
            $addFields: {
              convertedApplicationId: { $toObjectId: "$applicationId" },
            },
          },
          {
            $lookup: {
              from: "applications",
              localField: "convertedApplicationId",
              foreignField: "_id",
              as: "application",
            },
          },
          {
            $unwind: "$application",
          },
          {
            $project: {
              _id: 1,
              userId: 1,
              applicationId: 1,
              createdAt: 1,
              notificationType: 1,
              phase: 1,
              // phaseSubmittedByClient: 1,
              name: "$user.name",
              email: "$user.email",
              profilePic: "$user.profilePic",
              phaseStatus: "$application.phaseStatus",
              phaseSubmittedByClient: "$application.phaseSubmittedByClient",
              isInitialRequestAccepted: "$application.isInitialRequestAccepted",
            },
          },
        ]);
        return res.status(200).json({phases, success: true});
        
    } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
    }
}

const getClientNotifications = async(req, res)=>{
  try {

    const application = await ApplicationModel.findOne({userId: req.userId.toString()});
    console.log(application._id.toString());
    const notifications = await PhaseNotificationModel.find({
      userId: req.userId.toString(),
      applicationId: application._id.toString(),
      notificationType: "client",
    });

    console.log(notifications);

    return res.status(200).json({notifications, success: true});
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
}

const getNotificationCount = async (req, res) => {
  try {
    const application = await ApplicationModel.findOne({
      userId: req.userId.toString(),
    });
    const notifications = await PhaseNotificationModel.find({
      userId: req.userId.toString(),
      applicationId: application._id.toString(),
      notificationType: "client",
      status: 0
    });
    console.log(notifications);
    const count = notifications?.length;
    return res.status(200).json({ count, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const getNotificationCountAdmin = async (req, res) => {
  try {
    const notifications = await PhaseNotificationModel.find({
      notificationType: "admin",
      status: 0,
    });
    console.log(notifications);
    const count = notifications?.length;
    return res.status(200).json({ count, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const readNotification = async(req,res)=>{
  try {

    await PhaseNotificationModel.updateMany(
      { userId: req.userId.toString(), notificationType: "client" },
      { $set: { status: 1 } },
      { new: true, useFindAndModify: false }
    );
    return res.status(200).json({ message: "Notification Seen.", success: true });
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
}

const readNotificationAdmin = async (req, res) => {
  try {
    await PhaseNotificationModel.updateMany(
      {notificationType: "admin" },
      { $set: { status: 1 } },
      { new: true, useFindAndModify: false }
    );
    return res
      .status(200)
      .json({ message: "Notification Seen.", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

module.exports = {
  getPhaseNotifications,
  getClientNotifications,
  readNotification,
  getNotificationCount,
  getNotificationCountAdmin,
  readNotificationAdmin,
};