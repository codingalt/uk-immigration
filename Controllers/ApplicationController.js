const ApplicationModel = require("../Models/ApplicationModel");
const UserModel = require("../Models/UserModel");

const phaseStaus = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
};

const postApplicationPhase1 = async(req,res)=>{
    try {
      const { phaseStatus, phase, applicationStatus } = req.body;
      if(phaseStatus || phase || applicationStatus){
        return res.status(400).json({message: "Action Forbidden! You don't have access to change."});
      }
        const user = await UserModel.findById(req.userId.toString());
        if(!user) return res.status(400).json({message: "User not found", success: false})
        const application = await new ApplicationModel(req.body).save();
        res.status(200).json({ application, success: true });
        
    } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    }  
}

const postApplicationPhase2 = async(req,res)=>{
    try {
      const { phaseStatus, phase, applicationStatus} = req.body;
      const {applicationId} = req.params;
      const files = req.files;
      if(phaseStatus || phase || applicationStatus){
        return res.status(400).json({message: "Action Forbidden! You don't have access to change."});
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
        if(!user) return res.status(400).json({message: "User not found", success: false})

        // Update Phase 2 
        const application = await ApplicationModel.findByIdAndUpdate(applicationId, {phase2: filesObj, phaseSubmittedByClient: 2}, { new: true, useFindAndModify: false });
        res.status(200).json({ application,success: true });
        
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

     // Update Phase 3 
    const application = await ApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        $set: { "phase3.paymentEvidence": chalanFile, phaseSubmittedByClient: 3 },
      },
      { new: true, useFindAndModify: false }
    );
    res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postApplicationPhase4 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus, general,accommodation,family,languageProficiency,education,employment,membership,maintenance,travel,character } = req.body;
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

        if(!general || !accommodation || !family || !languageProficiency || !education || !employment || !membership || !maintenance || !travel || !character){
          return res.status(400).json({message:"Please Provide all the information Properly.", success: false});
        }

    const application = await ApplicationModel.findByIdAndUpdate(applicationId, {phase4: req.body, phaseSubmittedByClient: 4},{new: true, useFindAndModify: false});
    res.status(200).json({ application, success: true });
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
        { phase: 3, phaseStaus: phaseStaus.Approved }
      );
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
        { ...req.body, requestedPhase: 2},
        { new: true, useFindAndModify: false }
      );
      return res.status(200).json({ message: "Phase 2 Requested", success: true });
    }else if(application.phase === 2 && application.phaseStatus === phaseStaus.Approved){
      await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { ...req.body, requestedPhase: 3 },
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
    const { applicationId } = req.body;
    const isApplication = await ApplicationModel.findById(applicationId);
    if(!isApplication) {
        return res.status(400).json({message: "Application not found with this id.", success: false});
    }
     await ApplicationModel.updateOne(
       { _id: applicationId },
       { $set: { applicationStatus: "rejected", phaseStaus: phaseStaus.Rejected } }
     );
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
    const result = await ApplicationModel.find(query).select({"phase1.name": true, "phase1.applicationType": true, "applicationStatus": true});
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


module.exports = {
  postApplicationPhase1,
  postApplicationPhase2,
  postApplicationPhase3,
  postApplicationPhase4,
  getApplicationData,
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
};