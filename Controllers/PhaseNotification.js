const ApplicationModel = require("../Models/ApplicationModel");
const CaseWorkerNotificationModel = require("../Models/CaseWorkerNotificationModel");
const CompanyClientModel = require("../Models/CompanyClientModel");
const PhaseNotificationModel = require("../Models/PhaseNotification");
const UserModel = require("../Models/UserModel");

// const getPhaseNotifications = async(req,res)=>{
//     try {

//         const phases = await PhaseNotificationModel.aggregate([
//           {
//             $match: {
//               notificationType: "admin",
//             },
//           },
//           {
//             $addFields: {
//               convertedId: { $toObjectId: "$userId" },
//             },
//           },
//           {
//             $lookup: {
//               from: "users",
//               localField: "convertedId",
//               foreignField: "_id",
//               as: "user",
//             },
//           },
//           {
//             $sort: {
//               createdAt: -1,
//             },
//           },
//           {
//             $unwind: "$user",
//           },
//           {
//             $addFields: {
//               convertedApplicationId: { $toObjectId: "$applicationId" },
//             },
//           },
//           {
//             $lookup: {
//               from: "applications",
//               localField: "convertedApplicationId",
//               foreignField: "_id",
//               as: "application",
//             },
//           },
//           {
//             $unwind: "$application",
//           },
//           {
//             $project: {
//               _id: 1,
//               userId: 1,
//               applicationId: 1,
//               createdAt: 1,
//               notificationType: 1,
//               phase: 1,
//               // phaseSubmittedByClient: 1,
//               name: "$user.name",
//               email: "$user.email",
//               profilePic: "$user.profilePic",
//               phaseStatus: "$application.phaseStatus",
//               phaseApp: "$application.phase",
//               phaseSubmittedByClient: "$application.phaseSubmittedByClient",
//               isInitialRequestAccepted: "$application.isInitialRequestAccepted",
//             },
//           },
//         ]);
//         return res.status(200).json({phases, success: true});
        
//     } catch (err) {
//     res.status(500).json({ message: err.message, success: false });
//     console.log(err);
//     }
// }

const getPhaseNotifications = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId.toString());
    let match;
    if(user.isAdmin){
      match = { notificationType: "admin" };
      console.log("match", match);
      const phases = await PhaseNotificationModel.aggregate([
        {
          $match: match,
        },
        {
          $addFields: {
            convertedId: { $toObjectId: "$userId" },
            convertedApplicationId: { $toObjectId: "$applicationId" },
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
          $unwind: "$user",
        },
        {
          $lookup: {
            from: "applications",
            let: { appId: "$convertedApplicationId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$appId"],
                  },
                },
              },
            ],
            as: "application",
          },
        },
        {
          $unwind: {
            path: "$application",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "companyclientapplications",
            let: { appId: "$convertedApplicationId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$appId"],
                  },
                },
              },
            ],
            as: "companyClientApplication",
          },
        },
        {
          $unwind: {
            path: "$companyClientApplication",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            applicationId: 1,
            createdAt: 1,
            notificationType: 1,
            phase: 1,
            name: "$user.name",
            email: "$user.email",
            googleId: "$user.googleId",
            profilePic: "$user.profilePic",
            phaseStatus: {
              $ifNull: [
                "$application.phaseStatus",
                "$companyClientApplication.phaseStatus",
              ],
            },
            phaseApp: {
              $ifNull: [
                "$application.phase",
                "$companyClientApplication.phase",
              ],
            },
            phaseSubmittedByClient: {
              $ifNull: [
                "$application.phaseSubmittedByClient",
                "$companyClientApplication.phaseSubmittedByClient",
              ],
            },
            isCaseWorkerHandling: {
              $ifNull: [
                "$application.isCaseWorkerHandling",
                "$companyClientApplication.isCaseWorkerHandling",
              ],
            },
            caseWorkerId: {
              $ifNull: [
                "$application.caseWorkerId",
                "$companyClientApplication.caseWorkerId",
              ],
            },
            companyId: {
              $ifNull: [
                "$application.companyId",
                "$companyClientApplication.companyId",
              ],
            },
            isInitialRequestAccepted: {
              $ifNull: [
                "$application.isInitialRequestAccepted",
                "$companyClientApplication.isInitialRequestAccepted",
              ],
            },
          },
        },
      ]);

      // Log the intermediate result for debugging
      console.log("Phases after aggregation:", phases);

      return res.status(200).json({ phases, success: true });
    }else if(user.isCaseWorker){
      match = { notificationType: "admin", caseWorkerId: req.userId.toString() };

      console.log("match", match);
      const phases = await CaseWorkerNotificationModel.aggregate([
        {
          $match: match,
        },
        {
          $addFields: {
            convertedId: { $toObjectId: "$userId" },
            convertedApplicationId: { $toObjectId: "$applicationId" },
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
          $unwind: "$user",
        },
        {
          $lookup: {
            from: "applications",
            let: { appId: "$convertedApplicationId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$appId"],
                  },
                },
              },
            ],
            as: "application",
          },
        },
        {
          $unwind: {
            path: "$application",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "companyclientapplications",
            let: { appId: "$convertedApplicationId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$appId"],
                  },
                },
              },
            ],
            as: "companyClientApplication",
          },
        },
        {
          $unwind: {
            path: "$companyClientApplication",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            applicationId: 1,
            createdAt: 1,
            notificationType: 1,
            phase: 1,
            name: "$user.name",
            email: "$user.email",
            googleId: "$user.googleId",
            profilePic: "$user.profilePic",
            phaseStatus: {
              $ifNull: [
                "$application.phaseStatus",
                "$companyClientApplication.phaseStatus",
              ],
            },
            phaseApp: {
              $ifNull: [
                "$application.phase",
                "$companyClientApplication.phase",
              ],
            },
            phaseSubmittedByClient: {
              $ifNull: [
                "$application.phaseSubmittedByClient",
                "$companyClientApplication.phaseSubmittedByClient",
              ],
            },
            isCaseWorkerHandling: {
              $ifNull: [
                "$application.isCaseWorkerHandling",
                "$companyClientApplication.isCaseWorkerHandling",
              ],
            },
            caseWorkerId: {
              $ifNull: [
                "$application.caseWorkerId",
                "$companyClientApplication.caseWorkerId",
              ],
            },
            companyId: {
              $ifNull: [
                "$application.companyId",
                "$companyClientApplication.companyId",
              ],
            },
            isInitialRequestAccepted: {
              $ifNull: [
                "$application.isInitialRequestAccepted",
                "$companyClientApplication.isInitialRequestAccepted",
              ],
            },
          },
        },
      ]);

      // Log the intermediate result for debugging
      console.log("Phases after aggregation:", phases);

      return res.status(200).json({ phases, success: true });
    }
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};


const getClientNotifications = async(req, res)=>{
  try {

    const application = await ApplicationModel.findOne({userId: req.userId.toString()});
    if(application){
      const notifications = await PhaseNotificationModel.find({
        userId: req.userId.toString(),
        applicationId: application._id.toString(),
        notificationType: "client",
      });

      console.log(notifications);

      return res
        .status(200)
        .json({ notifications, success: true, companyClient: false });
    }else{
    const groupApp = await CompanyClientModel.findOne({userId: req.userId.toString()});
    const notifications = await PhaseNotificationModel.find({
      userId: req.userId.toString(),
      applicationId: groupApp._id.toString(),
      notificationType: "client",
    });
    console.log(notifications);
    return res.status(200).json({ notifications, success: true,companyClient: true });

    }
    
    
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

// Get Case worker notifications 
const getNotificationCountCaseWorker = async (req, res) => {
  try {
    const notifications = await CaseWorkerNotificationModel.find({
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

// Read Notification Case Worker 
const readNotificationCaseWorker = async (req, res) => {
  try {
    await CaseWorkerNotificationModel.updateMany(
      { notificationType: "admin" },
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
  getNotificationCountCaseWorker,
  readNotificationCaseWorker,
};