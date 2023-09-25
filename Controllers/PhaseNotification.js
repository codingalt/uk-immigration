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
              _id: 0,
              userId: 1,
              applicationId: 1,
              createdAt: 1,
              name: "$user.name",
              email: "$user.email",
              profilePic: "$user.profilePic",
              phase: "$application.phase",
              phaseStatus: "$application.phaseStatus",
              isInitialRequestAccepted: "$application.isInitialRequestAccepted",
            },
          },
        ]);
        return res.status(200).json({phases, success: true});
        
    } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    }
}

module.exports= {getPhaseNotifications}