const ApplicationModel = require("../Models/ApplicationModel");
const UserModel = require("../Models/UserModel");
const { sendNotification } = require("../Utils/sendNotification");
const otpGenerator = require("otp-generator");
const { createChat } = require("./ChatController");
const ChatModel = require("../Models/ChatModel");
const MessageModel = require("../Models/MessageModel");
const nodemailer = require("nodemailer");
const { sendEmail } = require("../Utils/sendEmail");
const CaseWorkerModel = require("../Models/CaseWorker");

const phaseStaus = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
};

const postApplicationPhase1 = async(req,res)=>{
    try {
      const { phaseStatus, phase, applicationStatus } = req.body;
      if (phaseStatus || phase || applicationStatus) {
        return res
          .status(400)
          .json({
            message: "Action Forbidden! You don't have access to change.",
          });
      }
      const user = await UserModel.findById(req.userId.toString());
      if (!user)
        return res
          .status(400)
          .json({ message: "User not found", success: false });

      // Generating CaseID
      const caseId = otpGenerator.generate(6, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      // Assign case to case worker 
      if (user.referringAgent){
        // Find Case Worker 
        const caseWorker = await UserModel.findOne({
          email: user.referringAgent,
        });
        
        if(caseWorker){
          req.body.isCaseWorkerHandling = true;
          req.body.caseWorkerId = caseWorker?._id;
          req.body.caseWorkerName = caseWorker?.name; 
        }
        
      }

      req.body.caseId = caseId;
      req.body.phaseSubmittedByClient = 1;

      // Check if application is already exist 
      const isApplicationAlready = await ApplicationModel.findOne({
        userId: req.userId.toString(),
      });

      if(isApplicationAlready) return res.status(400).json({message: 'Your Application already exists',success: false})

      const application = await new ApplicationModel(req.body).save();

      // Create Chat with this Application 
      const chat = await createChat({userId: req.userId.toString(),applicationId: application._id})
      if(chat.success) {

        const {
          phase1,
          userId,
          phaseSubmittedByClient,
          isInitialRequestAccepted,
        } = application;
        const result = {
          phase1,
          userId,
          applicationStatus: application.applicationStatus,
          phase: application.phase,
          phaseStatus: application.phaseStatus,
          phaseSubmittedByClient,
          isInitialRequestAccepted,
        };
        console.log(result);
        res.status(200).json({ result, success: true });

      }else{
        return res.status(500).json({message: "Error Creating Chat", success: false});
      }

      
    } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
    }  
}

const postApplicationPhase2 = async(req,res)=>{
    try {
      const { phaseStatus, phase, applicationStatus, applicationId } = req.body;
      // const { applicationId } = req.params;
      const files = req.files;
      if (phaseStatus || phase || applicationStatus) {
        return res.status(400).json({
          message: "Action Forbidden! You don't have access to change.",
        });
      }

      const filesObj = {};

      if (files) {
        Object.keys(files).forEach((file) => {
          if (file === "other") {
            files[file].forEach((item) => {
              if (!filesObj["other"]) {
                filesObj["other"] = []; // Initialize "other" property as an array
              }
              filesObj["other"].push(`/Uploads/${item.filename}`);
            });
          } else {
            filesObj[file] = `/Uploads/${files[file][0].filename}`;
          }
        });
      }

      const user = await UserModel.findById(req.userId.toString());
      if (!user)
        return res
          .status(400)
          .json({ message: "User not found", success: false });
      console.log(applicationId);
      // Check if admin has requested client for phase
      const isRequested = await ApplicationModel.findById(applicationId);
        if(!user.isAdmin){
        if (isRequested.requestedPhase < 2) {
          return res.status(400).json({
            message:
              "You can't submit phase 2 data right now, Untill admin requests you to submit phase 2 data.",
          });
        }
       }


      // Check which fields/data is required
      const phase2Data = isRequested.phase2;

      const filteredData = Object.fromEntries(
        Object.entries(phase2Data).filter(([key, value]) => value !== "notreq")
      );

      // Exclude "otherDocumentNotes" from validation
      const filteredDataKeys = Object.keys(filteredData).filter(
        (key) => key !== "otherDocumentNotes"
      );

      // Now validate whether required fields are submitted by client
      const missingProperties = filteredDataKeys.filter(
        (key) => !filesObj.hasOwnProperty(key)
      );

      if (missingProperties.length > 0) {
        return res.status(400).json({
          message: `Error: The following properties are missing in filesObj: ${missingProperties.join(
            ", "
          )}`,
          success: false,
        });
      }

      if(user.isAdmin){

        // Update Phase 2
        const application = await ApplicationModel.findByIdAndUpdate(
          applicationId,
          { $set: { phase2: filesObj, phaseSubmittedByClient: 2, phase: 2, phaseStatus: phaseStatus.Approved } },
          { new: true, useFindAndModify: false }
        );
        res.status(200).json({ application, success: true });

      }else{
        // Update Phase 2
        const application = await ApplicationModel.findByIdAndUpdate(
          applicationId,
          { $set: { phase2: filesObj, phaseSubmittedByClient: 2 } },
          { new: true, useFindAndModify: false }
        );
        res.status(200).json({ application, success: true });
      }

      
    } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
    }  
}

const postApplicationPhase3 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
      const { applicationId } = req.params;
      const files = req.files;
      const chalanFile = `/Uploads/${files.chalan[0].filename}`
    if (phaseStatus || phase || applicationStatus) {
      return res
        .status(400)
        .json({
          message: "Action Forbidden! You don't have access to change.",
        });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });

        // Check if admin has requested client for phase 
        const isRequested = await ApplicationModel.findById(applicationId);

        if(!user.isAdmin) {
          if(isRequested.requestedPhase < 3){
          return res.status(400).json({message: "You can't submit phase 3 data right now, Untill admin requests you to submit phase 3 data."})
        }
        }
        
        if(user.isAdmin){
          // Update Phase 3
          const application = await ApplicationModel.findByIdAndUpdate(
            applicationId,
            {
              $set: {
                "phase3.paymentEvidence": chalanFile,
                "phase3.isOnlinePayment": false,
                "phase3.isPaid": true,
                phaseSubmittedByClient: 3,
                phase: 3,
                phaseStatus: phaseStatus.Approved,
              },
            },
            { new: true, useFindAndModify: false }
          );
          res.status(200).json({ application, success: true });
        }else{
          // Update Phase 3
          const application = await ApplicationModel.findByIdAndUpdate(
            applicationId,
            {
              $set: {
                "phase3.paymentEvidence": chalanFile,
                "phase3.isOnlinePayment": false,
                "phase3.isPaid": true,
                phaseSubmittedByClient: 3,
              },
            },
            { new: true, useFindAndModify: false }
          );
          res.status(200).json({ application, success: true });
        }
     
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postApplicationPhase4 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus} = req.body;
      const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res
        .status(400)
        .json({
          message: "Action Forbidden! You don't have access to change.",
        });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user) return res.status(400).json({ message: "User not found", success: false });

        // if(!general1 || !accommodation1 || !family1 || !languageProficiency1 || !education1 || !employment1 || !membership1 || !maintenance1 || !travel1 || !character1){
        //   return res.status(400).json({message:"Please Provide all the information Properly.", success: false});
        // }
    console.log(req.body);
        if(user.isAdmin){

          const application = await ApplicationModel.findByIdAndUpdate(applicationId, {...req.body, phaseSubmittedByClient: 4, phase: 4, phaseStatus: phaseStatus.Approved},{new: true, useFindAndModify: false});
          res.status(200).json({ application, success: true });

        }else{
          const application = await ApplicationModel.findByIdAndUpdate(applicationId, {...req.body, phaseSubmittedByClient: 4},{new: true, useFindAndModify: false});
          res.status(200).json({ application, success: true });
        }

    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const acceptInitialRequest = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res
        .status(400)
        .json({
          message: "Application not found with this id",
          success: false,
        });
    }
    await ApplicationModel.findByIdAndUpdate(applicationId,{ $set: { isInitialRequestAccepted: true } }, {new: true, useFindAndModify: false});

    res
      .status(200)
      .json({ message: "Application's Initial Request Accepted.", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const approvePhase1 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res
        .status(400)
        .json({
          message: "Application not found with this id",
          success: false,
        });
    }

    await ApplicationModel.updateOne(
      { _id: applicationId },
      { phaseStatus: "approved", isInitialRequestAccepted: true }
    );

    const email = isApplication.phase1.email;
    const html = `<b>Congratulations! Your application's initial phase has been approved. Please log in to the website to check your application status.</b> <br>`;
    
    const info = await sendEmail(email, "Congratulations! Phase Approved.", '',html);
    let content = "Congratulations, Phase Approved Successfully. Click here to continue"

    // Find Chat 
    const chat = await ChatModel.findOne({ applicationId: applicationId });
    if(chat){
      // Append Approved Phase Message
      const newMessage = new MessageModel({
        sender: req.userId.toString(),
        content: content,
        chatId: chat?._id,
        isPhaseApprovedMessage: true,
        redirect: "/phase2"
      });
      const approveMsg = await newMessage.save();
      console.log(approveMsg);

      // Update Latest Message
      await ChatModel.findByIdAndUpdate(chat?._id, {
        latestMessage: content,
      });
    }
    

    res
      .status(200)
      .json({ message: "Application(Phase 1) Approved Successfully.", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const approvePhase2 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }

    if (isApplication.phase === 1 && isApplication.phaseStatus === phaseStaus.Approved){
      await ApplicationModel.updateOne(
        { _id: applicationId },
        { phase: 2, phaseStaus: phaseStaus.Approved }
      );
      
      let content =
        "Congratulations, Phase Approved Successfully. Click here to continue";

      // Find Chat
      const chat = await ChatModel.findOne({ applicationId: applicationId });
      if (chat) {
        // Append Approved Phase Message
        const newMessage = new MessageModel({
          sender: req.userId.toString(),
          content: content,
          chatId: chat?._id,
          isPhaseApprovedMessage: true,
          redirect: "/phase3",
        });
        const approveMsg = await newMessage.save();
        console.log(approveMsg);

        // Update Latest Message
        await ChatModel.findByIdAndUpdate(chat?._id, {
          latestMessage: content,
        });
      }

      res.status(200).json({message: "Application(Phase 2) Approved Successfully.", success: true})
    }else{
      return res.status(400).json({message: "Action Forbidden! To approve phase 2, Application's phase 1 must be approved.", success: false})
    }
  
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const approvePhase3 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }

    if (
      isApplication.phase === 2 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        { phase: 3, phaseStaus: phaseStaus.Approved, "phase3.isPaid": true }
      );

      let content =
        "Congratulations, Phase Approved Successfully. Click here to continue";

      // Find Chat
      const chat = await ChatModel.findOne({ applicationId: applicationId });
      if (chat) {
        // Append Approved Phase Message
        const newMessage = new MessageModel({
          sender: req.userId.toString(),
          content: content,
          chatId: chat?._id,
          isPhaseApprovedMessage: true,
          redirect: "/phase3",
        });
        const approveMsg = await newMessage.save();
        console.log(approveMsg);

        // Update Latest Message
        await ChatModel.findByIdAndUpdate(chat?._id, {
          latestMessage: content,
        });
        }

      res
        .status(200)
        .json({
          message: "Application (Phase 3) Approved Successfully.",
          success: true,
        });
    } else {
      return res
        .status(400)
        .json({
          message:
            "Action Forbidden! To approve phase 3, Application's phase 2 must be approved.",
          success: false,
        });
    }

  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const approvePhase4 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }

    if (
      isApplication.phase === 3 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        { phase: 4, phaseStaus: phaseStaus.Approved, applicationStatus: "approved" }
      );

      let content =
        "Congratulations, Phase Approved Successfully. Click here to continue";

      // Find Chat
      const chat = await ChatModel.findOne({ applicationId: applicationId });
      if (chat) {
        // Append Approved Phase Message
        const newMessage = new MessageModel({
          sender: req.userId.toString(),
          content: content,
          chatId: chat?._id,
          isPhaseApprovedMessage: true,
        });
        await newMessage.save();

        // Update Latest Message
        await ChatModel.findByIdAndUpdate(chat?._id, {
          latestMessage: content,
        });
      }

      res.status(200).json({
        message: "Application (Phase 4) Approved Successfully.",
        success: true,
      });
    } else {
      return res.status(400).json({
        message:
          "Action Forbidden! To approve phase 4, Application's phase 3 must be approved.",
        success: false,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const requestAPhase = async(req,res)=>{
  try {
    const {applicationId} = req.params;
    const application = await ApplicationModel.findById(applicationId);
    if(application.phase === 1 && application.phaseStatus === phaseStaus.Approved){
       await ApplicationModel.findByIdAndUpdate(
         applicationId,
         { $set: { ...req.body, requestedPhase: 2 } },
         { new: true, useFindAndModify: false }
       );
      return res.status(200).json({ message: "Phase 2 Requested", success: true });
    }else if(application.phase === 2 && application.phaseStatus === phaseStaus.Approved){
      await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { $set: { ...req.body, requestedPhase: 3 } },
        { new: true, useFindAndModify: false }
      );
      return res
        .status(200)
        .json({ message: "Phase 3 Requested", success: true });
    }else{
      return res.status(400).json({ message: "To Request this phase, previous phase must be approved.", success: false})
    }
    
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
}

// Update Application Phases Data By Admin 

const updatePhaseByAdmin = async (req, res) => {
  try {
    const {applicationId} = req.params;
    const {phase,data} = req.body;
    const user = await UserModel.findById(req.userId.toString());
    if (!user) return res.status(400).json({ message: "User not found", success: false });

    if(phase === 1){
      const application = await ApplicationModel.findByIdAndUpdate(applicationId,{ $set: { phase1: data } }, {new: true, useFindAndModify: false})
      res.status(200).json({ application, success: true });
    }

    if(phase === 2){
      const application = await ApplicationModel.findByIdAndUpdate(applicationId,{ $set: { phase2: data } }, {new: true, useFindAndModify: false})
      res.status(200).json({ application, success: true });
    }

    if(phase === 3){
      const application = await ApplicationModel.findByIdAndUpdate(applicationId,{ $set: { phase3: data } }, {new: true, useFindAndModify: false});
      res.status(200).json({ application, success: true });
    }

    if(phase === 4){
      const application = await ApplicationModel.findByIdAndUpdate(applicationId,{ $set: { phase4: data } }, {new: true, useFindAndModify: false})
      res.status(200).json({ application, success: true });
    }
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const getApplicationData = async (req, res) => {
  try {
    const application = await ApplicationModel.find({});
    res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const getApplicationDataById = async (req, res) => {
  try {
    const {applicationId} = req.params;
    const application = await ApplicationModel.findById(applicationId);
    res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const getApplicationByUserId = async (req, res) => {
  try {
    const application = await ApplicationModel.findOne({userId: req.userId.toString()});
    res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const getApplicationDataByUser = async (req, res) => {
  try {
    const application = await ApplicationModel.find({}).select({"phase1.name": true, "phase1.applicationType": true, "applicationStatus": true});
    res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const updateApplicationData = async (req, res) => {
  try {
    const {applicationId} = req.body;
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res
        .status(400)
        .json({ message: "Application not found with this id", success: false });
    }
     await ApplicationModel.updateOne({
      _id: applicationId,
      ...req.body,
    });
    res.status(200).json({ message: "Application Updated Successfully", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const rejectApplication = async (req, res) => {
  try {
    const { applicationId, rejectPhaseReason } = req.body;
    const isApplication = await ApplicationModel.findById(applicationId);
    if(!isApplication) {
        return res.status(400).json({message: "Application not found with this id.", success: false});
    }
     await ApplicationModel.updateOne(
       { _id: applicationId },
       {
         $set: {
           applicationStatus: "rejected",
           phaseStaus: phaseStaus.Rejected,
           rejectPhaseReason: rejectPhaseReason,
         },
       }
     );
      
     let content =
       "Apologies, form rejected. Incomplete documentation. Please resubmit with all details.";

     // Find Chat
     const chat = await ChatModel.findOne({ applicationId: applicationId });
     if (chat) {
       // Append Approved Phase Message
       const newMessage = new MessageModel({
         sender: req.userId.toString(),
         content: content,
         chatId: chat?._id,
         isPhaseMessage: true,
       });
       await newMessage.save();

       // Update Latest Message
       await ChatModel.findByIdAndUpdate(chat?._id, {
         latestMessage: content,
       });
     }

    res
      .status(200)
      .json({ message: "Application Rejected", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Search Filter Application 
const filterApplication = async (req, res) => {
  try {
    const queryConditions = [];
    const {filters} = req.body;
    if (filters.name) {
      queryConditions.push({ "phase1.name": { $regex: new RegExp(filters.name, "i") } });
    }

    if (filters.caseId) {
      queryConditions.push({
        _id: { $regex: new RegExp(filters.caseId, "i") },
      });
    }

    if (filters.country) {
      queryConditions.push({
        "phase1.country": { $regex: new RegExp(filters.country, "i") },
      });
    }

    if (filters.birthDate) {
      queryConditions.push({
        "phase1.birthDate": { $regex: new RegExp(filters.birthDate, "i") },
      });
    }

    console.log(queryConditions);

    const query = queryConditions.length === 1 ? { $or: queryConditions } : queryConditions.length > 1 ? { $and: queryConditions } : {}; 
    const result = await ApplicationModel.find(query).select({
      "phase1.name": true,
      "phase1.email": true,
      "phase1.contact": true,
      "phase1.birthDate": true,
      "phase1.country": true,
      "caseId": true,
      "phase1.applicationType": true,
      applicationStatus: true,
    });
    res.status(200).json({ result, success: true });
  } catch (error) {
    res.status(500).json(error);
  }
};

// Add Note to Application By Admin
const addNotes = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const {notes} = req.body;
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res
        .status(400)
        .json({
          message: "Application not found with this id",
          success: false,
        });
    }
    await ApplicationModel.findByIdAndUpdate(
      { _id: applicationId },
      {
        $push: { notes: notes },
      },
      {
        new: true,
        useFindAndModify: false,
      }
    );
    res
      .status(200)
      .json({ message: "Notes Added Successfully", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
}; 

// Assign Application to CaseWorker By Admin 
const assignApplicationToCaseWorker = async (req, res) => {
  try {
    const { applicationId, caseWorkerId,caseWorkerName } = req.body;
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res
        .status(400)
        .json({
          message: "Application not found with this id.",
          success: false,
        });
    }
    await ApplicationModel.updateOne(
      { _id: applicationId },
      {
        $set: {
          isCaseWorkerHandling: true,
          caseWorkerId: caseWorkerId,
          caseWorkerName: caseWorkerName,
        },
      }
    );

    // Add This CaseWorker ID to Chat 
    const chat = await ChatModel.updateOne(
      { applicationId: applicationId },
      { $addToSet: { users: caseWorkerId } },
      { new: true, useFindAndModify: false }
    );
   
    res.status(200).json({ message: "CaseWorker Assigned", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Get Invoice Details
const getInvoiceDetails = async(req,res)=>{
  try {
    const invoices = await ApplicationModel.aggregate([
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
        $project: {
          _id: 0,
          userId: 1,
          phase3: 1,
          name: "$user.name",
          email: "$user.email",
          profilePic: "$user.profilePic",
        },
      },
    ]);
    return res.status(200).json({ invoices: invoices, success: true });
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
}

// Search Filter Invoices of Application 
const filterInvoices = async (req, res) => {
  try {
    const queryConditions = [];
    const {filters} = req.body;
    if (filters.name) {
      queryConditions.push({ "phase1.name": { $regex: new RegExp(filters.name, "i") } });
    }

    if (filters.applicationType) {
      queryConditions.push({
        "phase1.applicationType": {
          $regex: new RegExp(filters.applicationType, "i"),
        },
      });
    }

    if (filters.caseWorkerId) {
      queryConditions.push({
        caseWorkerId: { $regex: new RegExp(filters.caseWorkerId, "i") },
      });
    }

    if (filters.from && filters.to) {
      // Filter by date range using $gte and $lte operators
      queryConditions.push({
        "phase3.dateTime": {
          $gte: new Date(filters.from),
          $lte: new Date(filters.to),
        },
      });
    } else if (filters.from) {
      // Filter by "from" date using $gte operator
      queryConditions.push({
        "phase3.dateTime": {
          $gte: new Date(filters.from),
        },
      });
    } else if (filters.to) {
      // Filter by "to" date using $lte operator
      queryConditions.push({
        "phase3.dateTime": {
          $lte: new Date(filters.to),
        },
      });
    }

    const query = queryConditions.length === 1 ? { $or: queryConditions } : queryConditions.length > 1 ? { $and: queryConditions } : {}; 
    const result = await ApplicationModel.find(query).select({
      caseId: true,
      "phase1.name": true,
      "phase1.applicationType": true,
      caseWorkerId: true,
      caseWorkerName: true,
      "phase3.dateTime": true,
      "phase3.cost": true,
      "phase3.isPaid": true,
    });

    // const query =
    //   queryConditions.length === 1
    //     ? { $or: queryConditions }
    //     : queryConditions.length > 1
    //     ? { $and: queryConditions }
    //     : {};
    // console.log(query);
    // const result = await ApplicationModel.aggregate([
    //   {
    //     $addFields: {
    //       convertedId: { $toObjectId: "$caseWorkerId" },
    //     },
    //   },
    //   {
    //     $match: query,
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "convertedId",
    //       foreignField: "_id",
    //       as: "caseWorker",
    //     },
    //   },
    //   {
    //     $unwind: "$caseWorker",
    //   },
    //   {
    //     $project: {
    //       caseId: true,
    //       "phase1.name": true,
    //       "phase1.applicationType": true,
    //       caseWorkerId: true,
    //       "phase3.dateTime": true,
    //       "phase3.cost": true,
    //       "phase3.isPaid": true,
    //       caseWorkerName: "$caseWorker.name",
    //     },
    //   },
    // ]);

    res.status(200).json({ result, success: true });
  } catch (error) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Link Company With Client Application 
const linkCompany = async(req,res)=>{
  try {
    const {applicationId} = req.params;
    const { companyId, name, email, fullNameCompanyContact } = req.body;

    if(!companyId || !name || !email || !fullNameCompanyContact || !applicationId){
      return res.status(400).json({message: "Please fill out all required fields", success: false});
    }

    const application = await ApplicationModel.findByIdAndUpdate(
      { _id: applicationId },
      { linkedCompany: {companyId,name, email, fullNameCompanyContact} },
      {new: true, useFindAndModify: false}
    );

    res.status(200).json({application, success: true});
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
}



module.exports = {
  postApplicationPhase1,
  postApplicationPhase2,
  postApplicationPhase3,
  postApplicationPhase4,
  getApplicationData,
  getApplicationDataById,
  getApplicationByUserId,
  getApplicationDataByUser,
  updateApplicationData,
  rejectApplication,
  filterApplication,
  acceptInitialRequest,
  approvePhase1,
  approvePhase2,
  approvePhase3,
  approvePhase4,
  requestAPhase,
  addNotes,
  updatePhaseByAdmin,
  assignApplicationToCaseWorker,
  getInvoiceDetails,
  filterInvoices,
  linkCompany
};