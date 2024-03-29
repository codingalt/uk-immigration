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
const PhaseNotificationModel = require("../Models/PhaseNotification");
const CompanyClientModel = require("../Models/CompanyClientModel");
const logo = `https://res.cloudinary.com/dncjtzg2i/image/upload/v1699259845/Ukimmigration-logo_dwq9tm.png`;

const phaseStaus = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
};

const transporter = nodemailer.createTransport({
  host: process.env.HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const postApplicationPhase1 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
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
    if (user.referringAgent) {
      // Find Case Worker
      const caseWorker = await UserModel.findById({
        _id: user.referringAgent,
      });

      if (caseWorker) {
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

    let service = [];
    service.push({
      serviceType: req.body.phase1.applicationType,
      dateTime: new Date(),
    });

    req.body.service = service;

    let application;

    if (isApplicationAlready) {
      req.body.phase1.status = "pending";
      application = await ApplicationModel.findByIdAndUpdate(
        isApplicationAlready._id,
        {
          $set: {
            ...req.body,
            phase: 1,
            phaseStatus: "pending",
            applicationStatus: "pending",
          },
        },
        { new: true, useFindAndModify: false }
      );
    } else {
      application = await new ApplicationModel(req.body).save();
    }

    const admin = await UserModel.findOne({ isAdmin: true });
    var date = new Date();
    var options = { year: "numeric", month: "long", day: "numeric" };
    var formattedDate = date.toLocaleDateString("en-US", options);
    // Send email to the user
    const url = `https://admin-immigration.netlify.app`;
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
  </head>
  <body
    style="
      width: 100%;
      height: 95vh;
      background-color: #f6f9fc;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: sans-serif;
    "
  >
    <div
      class="card"
      style="
        width: 60%;
        height: 75%;
        background-color: #fff;
        border-radius: 10px;
        padding: 30px;
        margin-top: 2rem;
        padding-left: 40px;
        margin: 2rem auto;
      "
    >
      <img
        src=${logo}
        alt=""
        style="margin-left: auto; margin-right: auto"
      />
      <h3
        style="
          color:#5D982E;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 0.5px;
        "
      >
        Client Submission - UK Immigration Phase 1
      </h3>

      <p
      style="
        color: #414552 !important;
        font-weight: 400;
        font-size: 18px;
        line-height: 24px;
        margin-top: 1rem;
        max-width: 90%;
      "
    >
      Dear Admin, 
    </p>

    <p
    style="
      color: #414552 !important;
      font-weight: 400;
      font-size: 18px;
      line-height: 24px;
      margin-top: 1rem;
      max-width: 80%;
    "
  >
    I hope this message finds you well. We are writing to inform you that one of your clients has successfully completed the initial phase of their UK immigration application process. We would like to request your attention to review and manage the application further.
    <br>
<b>Client Information: </b> <br>

Name: ${user.name} <br>
Application ID: ${caseId} <br>
Date of Submission: ${formattedDate} <br>
  </p>

      <a
        style="margin-top: 1.5rem; cursor: pointer"
        href=${url}
        target="_blank"
        ><button
          style="
            width: 10.4rem;
            height: 2.8rem;
            border-radius: 8px;
            outline: none;
            border: none;
            color: #fff;
            background-color:#5D982E;
            font-weight: 600;
            font-size: 1.05rem;
            cursor: pointer;
          "
        >
        login
        </button></a
      >

      <p
        style="
          color: #414552 !important;
          font-weight: 400;
          font-size: 16px;
          line-height: 24px;
          max-width: 88%;
          margin-top: 6rem;
        "
      >
      All rights reserved by UK Immigration © 2023.
      </p>
    </div>
  </body>
</html>`;
    await transporter.sendMail({
      from: {
        address: "testmailingsmtp@lesoft.io",
        name: "Lesoft",
      },
      to: admin?.email,
      subject: "Client Submission - UK Immigration Phase 1",
      text: "",
      html: html,
    });

    // Create Chat with this Application
    const chat = await createChat({
      userId: req.userId.toString(),
      applicationId: application._id,
      caseWorkerId: req.body.caseWorkerId ? req.body.caseWorkerId : null,
    });
    if (chat.success) {
      const {
        phase1,
        userId,
        _id,
        phaseSubmittedByClient,
        isInitialRequestAccepted,
      } = application;
      const result = {
        phase1,
        userId,
        _id,
        applicationStatus: application.applicationStatus,
        phase: application.phase,
        phaseStatus: application.phaseStatus,
        phaseSubmittedByClient,
        isInitialRequestAccepted,
        caseWorkerId: application?.caseWorkerId,
      };
      console.log(result);
      res.status(200).json({ result, success: true });
    } else {
      return res
        .status(500)
        .json({ message: "Error Creating Chat", success: false });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};

const postApplicationPhase2 = async (req, res) => {
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

    if (user.isAdmin || user.isCaseWorker) {
      // Update Phase 2
      const filesObjTemp = { ...filesObj, status: "approved" };
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          $set: {
            phase2: filesObjTemp,
            phaseSubmittedByClient: 2,
            phase: 2,
            phaseStatus: "approved",
            applicationStatus: "pending",
            $push: {
              report: { phase: 2, status: "approved", dateTime: new Date() },
            },
          },
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      // Check which fields/data is required
      const phase2Data = isRequested.phase2;

      const filteredData = Object.fromEntries(
        Object.entries(phase2Data).filter(([key, value]) => value !== "notreq")
      );

      var propertiesToExclude = ["otherDocumentNotes", "other", "status"];
      // Exclude "otherDocumentNotes" from validation
      var filteredDataKeys = Object.keys(filteredData).filter(
        (key) => !propertiesToExclude.includes(key)
      );

      console.log(filteredDataKeys);

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
      const filesObjTemp = { ...filesObj, status: "pending" };
      // Update Phase 2
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          $set: {
            phase2: filesObjTemp,
            phaseSubmittedByClient: 2,
            phase: 2,
            phaseStatus: "pending",
            applicationStatus: "pending",
          },
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};

const postApplicationPhase3 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    const files = req.files;
    console.log("Files", files);
    const chalanFile = `/Uploads/${files?.chalan[0]?.filename}`;
    console.log("Chalan File", chalanFile);
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
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

    console.log("isAdmin", user.isAdmin, "isCaseworker", user.isCaseWorker);

    if (user.isAdmin || user.isCaseWorker) {
      console.log("Admin condition running");
      // Update Phase 3
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          $set: {
            "phase3.paymentEvidence": chalanFile,
            "phase3.isOnlinePayment": false,
            "phase3.isPaid": true,
            "phase3.dateTime": new Date(),
            phaseSubmittedByClient: 3,
            phase: 3,
            phaseStatus: "approved",
            "phase3.status": "approved",
            $push: {
              report: { phase: 3, status: "approved", dateTime: new Date() },
            },
          },
        },
        { new: true, useFindAndModify: false }
      );
      return res.status(200).json({ application, success: true });
    } else {
      // Update Phase 3
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          $set: {
            "phase3.paymentEvidence": chalanFile,
            "phase3.isOnlinePayment": false,
            "phase3.isPaid": true,
            "phase3.dateTime": new Date(),
            phaseSubmittedByClient: 3,
            phase: 3,
            phaseStatus: "pending",
            applicationStatus: "pending",
            "phase3.status": "pending",
          },
        },
        { new: true, useFindAndModify: false }
      );
      if (application) {
        return res.status(200).json({ application, success: true });
      }
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postApplicationPhase4 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });

    // if(!general1 || !accommodation1 || !family1 || !languageProficiency1 || !education1 || !employment1 || !membership1 || !maintenance1 || !travel1 || !character1){
    //   return res.status(400).json({message:"Please Provide all the information Properly.", success: false});
    // }

    if (user.isAdmin || user.isCaseWorker) {
      console.log("Admin condition");
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          ...req.body,
          phaseSubmittedByClient: 4,
          phase: 4,
          phaseStatus: "approved",
          $push: {
            report: { phase: 4, status: "approved", dateTime: new Date() },
          },
        },
        { new: true, useFindAndModify: false }
      );
      return res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { ...req.body, phaseSubmittedByClient: 4 },
        { new: true, useFindAndModify: false }
      );
      return res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Add Application Manual
const postPhase1Manual = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }

    const { name, email, contact } = req.body.phase1;

    const userExist = await UserModel.findOne({ email: email });
    if (userExist) {
      return res
        .status(422)
        .json({ message: "Email already exist", success: false });
    }

    const user = new UserModel({
      name,
      email,
      password: "immigration@123",
      contact,
    });
    await user.generateAuthToken();
    const userData = await user.save();

    // Generating CaseID
    const caseId = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    let service = [];
    service.push({
      serviceType: req.body.phase1.applicationType,
      dateTime: new Date(),
    });

    req.body.service = service;

    req.body.userId = userData._id;
    req.body.caseId = caseId;
    req.body.phaseSubmittedByClient = 1;
    req.body.phase = 1;
    req.body.phaseStatus = "approved";
    req.body.phase1.status = "approved";
    req.body.isInitialRequestAccepted = true;
    req.body.isManual = true;
    if (!req.body.report) {
      req.body.report = [];
    }

    req.body.report.push({
      phase: 1,
      status: "approved",
      dateTime: new Date(),
    });

    // Check if application is already exist
    const isApplicationAlready = await ApplicationModel.findOne({
      userId: userData._id,
    });

    if (isApplicationAlready)
      return res
        .status(400)
        .json({ message: "Your Application already exists", success: false });

    const application = await new ApplicationModel(req.body).save();
    console.log("Application phase 1 manual save", application);
    if (!application) {
      await UserModel.deleteOne({ _id: userData._id });
    }

    // Create Chat with this Application
    const chat = await createChat({
      userId: userData._id,
      applicationId: application._id,
    });
    if (chat.success) {
      const {
        phase1,
        userId,
        _id,
        phaseSubmittedByClient,
        isInitialRequestAccepted,
      } = application;
      const result = {
        phase1,
        userId,
        _id,
        applicationStatus: application.applicationStatus,
        phase: application.phase,
        phaseStatus: application.phaseStatus,
        phaseSubmittedByClient,
        isInitialRequestAccepted,
      };
      console.log(result);
      res.status(200).json({ result, success: true });
    } else {
      return res
        .status(500)
        .json({ message: "Error Creating Chat", success: false });
    }
  } catch (err) {
    console.log("catch block userId", req.body.userId);
    await UserModel.deleteOne({ _id: req.body.userId });
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};

const updatePhase1Manual = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    console.log(req.body);
    if (user.isAdmin || user.isCaseWorkerHandling) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          phase1: req.body.phase1,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postGeneral = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    console.log(req.body);
    if (user.isAdmin || user.isCaseWorker) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.general": req.body,
          "phase4.isCompleted": 1,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.general": req.body, "phase4.isCompleted": 1 },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postAccomodation = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    console.log(req.body);
    if (user.isAdmin || user.isCaseWorker) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.accommodation": req.body,
          "phase4.isCompleted": 2,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.accommodation": req.body, "phase4.isCompleted": 2 },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postFamily = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    console.log(req.body);
    if (user.isAdmin || user.isCaseWorker) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.family": req.body,
          "phase4.isCompleted": 3,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.family": req.body, "phase4.isCompleted": 3 },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postLanguage = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    console.log(req.body);
    if (user.isAdmin || user.isCaseWorker) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.languageProficiency": req.body,
          "phase4.isCompleted": 4,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.languageProficiency": req.body, "phase4.isCompleted": 4 },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postEducation = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    console.log(req.body);
    if (user.isAdmin || user.isCaseWorker) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.education": req.body,
          "phase4.isCompleted": 5,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.education": req.body, "phase4.isCompleted": 5 },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postEmployment = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    console.log(req.body);
    if (user.isAdmin || user.isCaseWorker) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.employment": req.body,
          "phase4.isCompleted": 6,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.employment": req.body, "phase4.isCompleted": 6 },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postMaintenance = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    console.log(req.body);
    if (user.isAdmin || user.isCaseWorker) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.maintenance": req.body,
          "phase4.isCompleted": 7,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.maintenance": req.body, "phase4.isCompleted": 7 },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postTravel = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    console.log(req.body);
    if (user.isAdmin || user.isCaseWorker) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.travel": req.body,
          "phase4.isCompleted": 8,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.travel": req.body, "phase4.isCompleted": 8 },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postCharacter = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    console.log(req.body);
    const application = await ApplicationModel.findById(applicationId);

    if (user.isAdmin || user.isCaseWorker) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.character": req.body,
          "phase4.isCompleted": 9,
          phaseSubmittedByClient: 4,
          phase: 4,
          phaseStatus: "approved",
          "phase4.status": "approved",
        },
        { new: true, useFindAndModify: false }
      );
      return res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.character": req.body,
          phaseSubmittedByClient: 4,
          "phase4.isCompleted": 9,
          phase: 4,
          phaseStatus: "pending",
          applicationStatus: "pending",
          "phase4.status": "pending",
        },
        { new: true, useFindAndModify: false }
      );
      return res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const updateApplicationService = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }

    const application = await ApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        "phase1.applicationType": req.body.applicationType,
        $push: {
          service: {
            serviceType: req.body.applicationType,
            dateTime: new Date(),
          },
        },
      },
      { new: true, useFindAndModify: false }
    );
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
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }

    if (isApplication.isInitialRequestAccepted) {
      return res
        .status(200)
        .json({ message: "Request Already Accepted.", success: false });
    }
    await ApplicationModel.findByIdAndUpdate(
      applicationId,
      { $set: { isInitialRequestAccepted: true } },
      { new: true, useFindAndModify: false }
    );

    res.status(200).json({
      message: "Application's Initial Request Accepted.",
      success: true,
    });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const approvePhase1 = async (req, res) => {
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
      isApplication.phase >= 1 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
      return res
        .status(400)
        .json({ message: "This Phase is Already Approved", success: false });
    }

    await ApplicationModel.updateOne(
      { _id: applicationId },
      {
        phase: 1,
        phaseStatus: "approved",
        "phase1.status": "approved",
        isInitialRequestAccepted: true,
        $push: {
          report: { phase: 1, status: "approved", dateTime: new Date() },
        },
      }
    );

    let content =
      "Congratulations, Phase 1 Approved Successfully. Click here to continue";

    // Find Chat
    const chat = await ChatModel.findOne({ applicationId: applicationId });
    if (chat) {
      // Append Approved Phase Message
      const newMessage = new MessageModel({
        sender: req.userId.toString(),
        content: content,
        chatId: chat?._id,
        isPhaseApprovedMessage: true,
        redirect: "/phase2",
      });
      const approveMsg = await newMessage.save();
      console.log(approveMsg);

      // Update Latest Message
      await ChatModel.findByIdAndUpdate(chat?._id, {
        latestMessage: content,
      });
    }

    res.status(200).json({
      message: "Application(Phase 1) Approved Successfully.",
      success: true,
    });
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

    if (
      isApplication.phase >= 2 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
      return res
        .status(400)
        .json({ message: "This Phase is Already Approved", success: false });
    }

    if (isApplication.phase === 2) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        {
          phase: 2,
          phaseStatus: "approved",
          "phase2.status": "approved",
          $push: {
            report: { phase: 2, status: "approved", dateTime: new Date() },
          },
        }
      );

      // let content =
      //   "Congratulations, Phase 2 Approved Successfully. Click here to continue";

      // // Find Chat
      // const chat = await ChatModel.findOne({ applicationId: applicationId });
      // if (chat) {
      //   // Append Approved Phase Message
      //   const newMessage = new MessageModel({
      //     sender: req.userId.toString(),
      //     content: content,
      //     chatId: chat?._id,
      //     isPhaseApprovedMessage: true,
      //     redirect: "/phase3",
      //   });
      //   const approveMsg = await newMessage.save();
      //   console.log(approveMsg);

      //   // Update Latest Message
      //   await ChatModel.findByIdAndUpdate(chat?._id, {
      //     latestMessage: content,
      //   });
      // }

      res.status(200).json({
        message: "Application(Phase 2) Approved Successfully.",
        success: true,
      });
    } else {
      return res.status(400).json({
        message:
          "Action Forbidden! To approve phase 2, Application's phase 1 must be approved.",
        success: false,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const approvePhase3 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await ApplicationModel.findById(applicationId);
    const user = await UserModel.findById(isApplication.userId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }

    if (
      isApplication.phase >= 3 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
      return res
        .status(400)
        .json({ message: "This Phase is Already Approved", success: false });
    }

    if (isApplication.phase === 3) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        {
          phase: 3,
          phaseStatus: phaseStaus.Approved,
          "phase3.status": "approved",
          $push: {
            report: { phase: 3, status: "approved", dateTime: new Date() },
          },
        }
      );

      // Send email to the user
      const url = `${process.env.BASE_URL}`;
      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
  </head>
  <body
    style="
      width: 100%;
      height: 95vh;
      background-color: #f6f9fc;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: sans-serif;
    "
  >
    <div
      class="card"
      style="
        width: 70%;
        height: 85%;
        background-color: #fff;
        border-radius: 10px;
        padding: 30px;
        margin-top: 2rem;
        padding-left: 40px;
        margin: 2rem auto;
      "
    >
      <img
        src=${logo}
        alt=""
        style="margin-left: auto; margin-right: auto"
      />
      <h3
        style="
          color:#5D982E;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 0.5px;
        "
      >
        Approval of UK Immigration Phase 3
      </h3>


      <p
      style="
        color: #414552 !important;
        font-weight: 400;
        font-size: 15px;
        line-height: 22px;
        margin-top: 1rem;
        max-width: 90%;
      "
    >
      Dear ${user.name}, 
    </p>

    <p
    style="
      color: #414552 !important;
      font-weight: 400;
      font-size: 14px;
      line-height: 24px;
      margin-top: 1rem;
      max-width: 90%;
    "
  >
    We are pleased to inform you that your third
    phase of the UK immigration application process has been approved. To
    continue with the next phase, please log in to your account on our
    immigration portal and complete the required information for the fourth
    phase. Ensure all necessary fields are accurately filled out before
    submitting your application. Your login details remain the same as
    previously provided. If you encounter any issues or require assistance
    during this phase, please don't hesitate to contact our support team at
    immigration@support.com. We appreciate your cooperation and prompt
    attention to this next stage of the process. We look forward to
    receiving your completed fourth phase submission. 
  </p>
  
  <p
  style="
    color: #414552 !important;
    font-weight: 400;
    font-size: 15px;
    line-height: 22px;
    margin-top: 1rem;
    max-width: 80%;
  "
>
 Best regards,
  Uk Immigration
</p>

      <a
        style="margin-top: 1.5rem; cursor: pointer"
        href=${url}
        target="_blank"
        ><button
          style="
            width: 10.4rem;
            height: 2.8rem;
            border-radius: 8px;
            outline: none;
            border: none;
            color: #fff;
            background-color:#5D982E;
            font-weight: 600;
            font-size: 1.05rem;
            cursor: pointer;
          "
        >
        login
        </button></a
      >

      <p
        style="
          color: #414552 !important;
          font-weight: 400;
          font-size: 16px;
          line-height: 24px;
          max-width: 88%;
          margin-top: 6rem;
        "
      >
      All rights reserved by UK Immigration © 2023.
      </p>
    </div>
  </body>
</html>`;
      const info = await transporter.sendMail({
        from: {
          address: "testmailingsmtp@lesoft.io",
          name: "Lesoft",
        },
        to: user?.email,
        subject: "Approval of UK Immigration Phase 3",
        text: "",
        html: html,
      });

      if (info.messageId) {
        console.log("Email sent to the user", info.messageId);
      }

      let content =
        "Congratulations, Phase 3 Approved Successfully. Click here to continue";

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

      res.status(200).json({
        message: "Application (Phase 3) Approved Successfully.",
        success: true,
      });
    } else {
      return res.status(400).json({
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
    const user = await UserModel.findById(isApplication.userId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }

    if (
      isApplication.phase >= 4 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
      return res
        .status(400)
        .json({ message: "This Phase is Already Approved", success: false });
    }

    if (isApplication.phase === 4) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        {
          phase: 4,
          phaseStatus: phaseStaus.Approved,
          applicationStatus: "approved",
          "phase4.status": "approved",
          $push: {
            report: { phase: 4, status: "approved", dateTime: new Date() },
          },
        }
      );

      // Send email to the user
      const url = `${process.env.BASE_URL}`;
      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
  </head>
  <body
    style="
      width: 100%;
      height: 95vh;
      background-color: #f6f9fc;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: sans-serif;
    "
  >
    <div
      class="card"
      style="
        width: 70%;
        height: 85%;
        background-color: #fff;
        border-radius: 10px;
        padding: 30px;
        margin-top: 2rem;
        padding-left: 40px;
        margin: 2rem auto;
      "
    >
      <img
        src=${logo}
        alt=""
        style="margin-left: auto; margin-right: auto"
      />
      <h3
        style="
          color:#5D982E;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 0.5px;
        "
      >
        Approval of UK Immigration Phase 4
      </h3>


      <p
      style="
        color: #414552 !important;
        font-weight: 400;
        font-size: 15px;
        line-height: 22px;
        margin-top: 1rem;
        max-width: 90%;
      "
    >
      Dear ${user?.name}, 
    </p>

    <p
    style="
      color: #414552 !important;
      font-weight: 400;
      font-size: 14px;
      line-height: 22px;
      margin-top: 1rem;
      max-width: 90%;
    "
  >
    We are pleased to inform you that your fourth
    phase of the UK immigration application process has been approved. Your login details remain the same as
    previously provided. If you encounter any issues or require assistance
    during this phase, please don't hesitate to contact our support team at
    immigration@support.com. We appreciate your cooperation and prompt
    attention to this next stage of the process. 
  </p>
  
  <p
  style="
    color: #414552 !important;
    font-weight: 400;
    font-size: 18px;
    line-height: 24px;
    margin-top: 1rem;
    max-width: 80%;
  "
>
 Best regards,
  Uk Immigration
</p>
      <a
        style="margin-top: 1.5rem; cursor: pointer"
        href=${url}
        target="_blank"
        ><button
          style="
            width: 10.4rem;
            height: 2.8rem;
            border-radius: 8px;
            outline: none;
            border: none;
            color: #fff;
            background-color:#5D982E;
            font-weight: 600;
            font-size: 1.05rem;
            cursor: pointer;
          "
        >
        login
        </button></a
      >

      <p
        style="
          color: #414552 !important;
          font-weight: 400;
          font-size: 16px;
          line-height: 24px;
          max-width: 88%;
          margin-top: 6rem;
        "
      >
      All rights reserved by UK Immigration © 2023.
      </p>
    </div>
  </body>
</html>`;

      const info = await transporter.sendMail({
        from: {
          address: "testmailingsmtp@lesoft.io",
          name: "Lesoft",
        },
        to: user?.email,
        subject: "Approval of UK Immigration Phase 4",
        text: "",
        html: html,
      });

      if (info.messageId) {
        console.log("Email sent to the user", info.messageId);
      }

      let content =
        "Congratulations, Phase 4 Approved Successfully. Click here to continue";

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

const requestAPhase = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await ApplicationModel.findById(applicationId);
    const user = await UserModel.findById(application.userId);

    // Rejected Conditions
    if (
      application.phase === 2 &&
      application.phaseStatus === phaseStaus.Rejected
    ) {
      let updatedRecord;
      req.body.phase2.status = application.phase2.status;
      updatedRecord = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { $set: { ...req.body, requestedPhase: 2, reRequest: 2 } },
        { new: true, useFindAndModify: false }
      );

      // Send email to the user
      const url = `${process.env.BASE_URL}`;
      const html = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title></title>
          </head>
          <body
            style="
              width: 100%;
              height: 95vh;
              background-color: #f6f9fc;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: sans-serif;
            "
          >
            <div
              class="card"
              style="
                width: 70%;
                height: 90%;
                background-color: #fff;
                border-radius: 10px;
                padding: 30px;
                margin-top: 2rem;
                padding-left: 40px;
                margin: 2rem auto;
              "
            >
              <img
                src=${logo}
                alt=""
                style="margin-left: auto; margin-right: auto"
              />
              <h3
                style="
                  color:#5D982E;
                  font-weight: 800;
                  font-size: 1.1rem;
                  letter-spacing: 0.5px;
                "
              >
                Request to Resubmit Phase 2 Data for Immigration Application
              </h3>

              <p
              style="
                color: #414552 !important;
                font-weight: 400;
                font-size: 15px;
                line-height: 24px;
                margin-top: 1rem;
                max-width: 80%;
              "
            >
              Dear ${user?.name},
            </p>

            <p
            style="
              color: #414552 !important;
              font-weight: 400;
              font-size: 14px;
              line-height: 22px;
              margin-top: 1rem;
              max-width: 90%;
            "
          >

    We are writing to inform you that your recently submitted Phase 2 data for your immigration application has been reviewed by our administrative team. Regrettably, we have identified some discrepancies that require your attention.

    In order to proceed with the processing of your application, we kindly request you to resubmit the Phase 2 data with the necessary corrections. Please carefully review the feedback provided by our team to address the specific issues mentioned.

    To facilitate the resubmission process, please log in to your account on our immigration portal and navigate to the "Phase 1 Submission" section. Once there, you will find the option to edit and update your information. Ensure that all the required fields are filled accurately and completely.

    If you encounter any difficulties or have questions regarding the corrections, please do not hesitate to reach out to our support team at [support@email.com]. We are here to assist you throughout the process and ensure a smooth experience.
          </p>

          <p
          style="
            color: #414552 !important;
            font-weight: 400;
            font-size: 14px;
            line-height: 22px;
            margin-top: 1rem;
            max-width: 80%;
          "
        >
         Best regards,
          Uk Immigration
        </p>
              <a
                style="margin-top: 1.5rem; cursor: pointer"
                href=${url}
                target="_blank"
                ><button
                  style="
                    width: 10.4rem;
                    height: 2.8rem;
                    border-radius: 8px;
                    outline: none;
                    border: none;
                    color: #fff;
                    background-color:#5D982E;
                    font-weight: 600;
                    font-size: 1.05rem;
                    cursor: pointer;
                  "
                >
                Login
                </button></a
              >

              <p
                style="
                  color: #414552 !important;
                  font-weight: 400;
                  font-size: 16px;
                  line-height: 24px;
                  max-width: 88%;
                  margin-top: 6rem;
                "
              >
              All rights reserved by UK Immigration © 2023.
              </p>
            </div>
          </body>
        </html>`;
      const info = await transporter.sendMail({
        from: {
          address: "testmailingsmtp@lesoft.io",
          name: "Lesoft",
        },
        to: user?.email,
        subject: "Request to Resubmit Phase 2 Data for Immigration Application",
        text: "",
        html: html,
      });

      if (info.messageId) {
        console.log("Email sent to the user", info.messageId);
      }

      return res.status(200).json({
        message: "Phase 2 Requested",
        data: updatedRecord,
        success: true,
      });
    }

    if (
      application.phase === 3 &&
      application.phaseStatus === phaseStaus.Rejected
    ) {
      req.body.phase3.status = application.phase3.status;
      let updatedRecord;
      updatedRecord = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { $set: { ...req.body, requestedPhase: 3, reRequest: 3 } },
        { new: true, useFindAndModify: false }
      );

      // Send email to the user
      const url = `${process.env.BASE_URL}`;
      const html = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title></title>
          </head>
          <body
            style="
              width: 100%;
              height: 95vh;
              background-color: #f6f9fc;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: sans-serif;
            "
          >
            <div
              class="card"
              style="
                width: 70%;
                height: 90%;
                background-color: #fff;
                border-radius: 10px;
                padding: 30px;
                margin-top: 2rem;
                padding-left: 40px;
                margin: 2rem auto;
              "
            >
              <img
                src=${logo}
                alt=""
                style="margin-left: auto; margin-right: auto"
              />
              <h3
                style="
                  color:#5D982E;
                  font-weight: 800;
                  font-size: 1.1rem;
                  letter-spacing: 0.5px;
                "
              >
                Request to Resubmit Phase 3 Data for Immigration Application
              </h3>

              <p
              style="
                color: #414552 !important;
                font-weight: 400;
                font-size: 15px;
                line-height: 24px;
                margin-top: 1rem;
                max-width: 80%;
              "
            >
              Dear ${user?.name},
            </p>

            <p
            style="
              color: #414552 !important;
              font-weight: 400;
              font-size: 14px;
              line-height: 22px;
              margin-top: 1rem;
              max-width: 90%;
            "
          >

    We are writing to inform you that your recently submitted Phase 3 data for your immigration application has been reviewed by our administrative team. Regrettably, we have identified some discrepancies that require your attention.

    In order to proceed with the processing of your application, we kindly request you to resubmit the Phase 3 data with the necessary corrections. Please carefully review the feedback provided by our team to address the specific issues mentioned.

    To facilitate the resubmission process, please log in to your account on our immigration portal and navigate to the "Phase 3 Submission" section. Once there, you will find the option to edit and update your information. Ensure that all the required fields are filled accurately and completely.

    If you encounter any difficulties or have questions regarding the corrections, please do not hesitate to reach out to our support team at [support@email.com]. We are here to assist you throughout the process and ensure a smooth experience.
          </p>

          <p
          style="
            color: #414552 !important;
            font-weight: 400;
            font-size: 14px;
            line-height: 22px;
            margin-top: 1rem;
            max-width: 80%;
          "
        >
         Best regards,
          Uk Immigration
        </p>
              <a
                style="margin-top: 1.5rem; cursor: pointer"
                href=${url}
                target="_blank"
                ><button
                  style="
                    width: 10.4rem;
                    height: 2.8rem;
                    border-radius: 8px;
                    outline: none;
                    border: none;
                    color: #fff;
                    background-color:#5D982E;
                    font-weight: 600;
                    font-size: 1.05rem;
                    cursor: pointer;
                  "
                >
                Login
                </button></a
              >

              <p
                style="
                  color: #414552 !important;
                  font-weight: 400;
                  font-size: 16px;
                  line-height: 24px;
                  max-width: 88%;
                  margin-top: 6rem;
                "
              >
              All rights reserved by UK Immigration © 2023.
              </p>
            </div>
          </body>
        </html>`;
      const info = await transporter.sendMail({
        from: {
          address: "testmailingsmtp@lesoft.io",
          name: "Lesoft",
        },
        to: user?.email,
        subject: "Request to Resubmit Phase 3 Data for Immigration Application",
        text: "",
        html: html,
      });

      if (info.messageId) {
        console.log("Email sent to the user", info.messageId);
      }

      return res.status(200).json({
        message: "Phase 3 Requested",
        data: updatedRecord,
        success: true,
      });
    }

    // Approved Condition
    if (
      application.phase === 1 &&
      application.phaseStatus === phaseStaus.Approved
    ) {
      if (application.requestedPhase >= 2) {
        return res.status(400).json({
          message: "You have already requested this phase.",
          success: false,
        });
      }
      await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          $set: {
            ...req.body,
            requestedPhase: 2,
            phase: 2,
            phaseStatus: "pending",
          },
        },
        { new: true, useFindAndModify: false }
      );

      // Send email to the user
      const url = `${process.env.BASE_URL}`;
      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
  </head>
  <body
    style="
      width: 100%;
      height: 95vh;
      background-color: #f6f9fc;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: sans-serif;
    "
  >
    <div
      class="card"
      style="
        width: 70%;
        height: 85%;
        background-color: #fff;
        border-radius: 10px;
        padding: 30px;
        margin-top: 2rem;
        padding-left: 40px;
        margin: 2rem auto;
      "
    >
      <img
        src=${logo}
        alt=""
        style="margin-left: auto; margin-right: auto"
      />
      <h3
        style="
          color:#5D982E;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 0.5px;
        "
      >
        Approval of UK Immigration Phase 1
      </h3>


      <p
      style="
        color: #414552 !important;
        font-weight: 400;
        font-size: 15px;
        line-height: 24px;
        margin-top: 1rem;
        max-width: 90%;
      "
    >
      Dear ${user.name}, 
    </p>

    <p
    style="
      color: #414552 !important;
      font-weight: 400;
      font-size: 14px;
      line-height: 22px;
      margin-top: 1rem;
      max-width: 90%;
    "
  >
    We are pleased to inform you that your initial
    phase of the UK immigration application process has been approved. To
    continue with the next phase, please log in to your account on our
    immigration portal and complete the required information for the second
    phase. Ensure all necessary fields are accurately filled out before
    submitting your application. Your login details remain the same as
    previously provided. If you encounter any issues or require assistance
    during this phase, please don't hesitate to contact our support team at
    immigration@support.com. We appreciate your cooperation and prompt
    attention to this next stage of the process. We look forward to
    receiving your completed second phase submission. 
  </p>
  
  <p
  style="
    color: #414552 !important;
    font-weight: 400;
    font-size: 14px;
    line-height: 24px;
    margin-top: 1rem;
    max-width: 80%;
  "
>
 Best regards,
  Uk Immigration
</p>

      <a
        style="margin-top: 1.5rem; cursor: pointer"
        href=${url}
        target="_blank"
        ><button
          style="
            width: 10.4rem;
            height: 2.8rem;
            border-radius: 8px;
            outline: none;
            border: none;
            color: #fff;
            background-color:#5D982E;
            font-weight: 600;
            font-size: 1.05rem;
            cursor: pointer;
          "
        >
        login
        </button></a
      >

      <p
        style="
          color: #414552 !important;
          font-weight: 400;
          font-size: 16px;
          line-height: 24px;
          max-width: 88%;
          margin-top: 6rem;
        "
      >
      All rights reserved by UK Immigration © 2023.
      </p>
    </div>
  </body>
</html>`;
      const info = await transporter.sendMail({
        from: {
          address: "testmailingsmtp@lesoft.io",
          name: "Lesoft",
        },
        to: user?.email,
        subject: "Approval of UK Immigration Phase 1",
        text: "",
        html: html,
      });

      if (info.messageId) {
        console.log("Email sent to the user", info.messageId);
      }

      return res
        .status(200)
        .json({ message: "Phase 2 Requested", success: true });
    } else if (
      application.phase === 2 &&
      application.phaseStatus === phaseStaus.Approved
    ) {
      if (application.requestedPhase >= 3) {
        return res.status(400).json({
          message: "You have already requested this phase.",
          success: false,
        });
      }
      req.body.phase3.status = "pending";
      let updatedRecord;
      if (!req.body.phase3.doesCompanyHelp) {
        req.body.phase3.applicationType = application.phase1.applicationType;
        req.body.phase3.status = "rejected";
        updatedRecord = await ApplicationModel.findByIdAndUpdate(
          applicationId,
          {
            $set: {
              ...req.body,
              requestedPhase: 3,
              phase: 3,
              phaseStatus: "rejected",
              applicationStatus: "rejected",
            },
            $push: {
              service: {
                serviceType: "Company cannot help",
                dateTime: new Date(),
              },
            },
          },
          { new: true, useFindAndModify: false }
        );
        console.log("updatedRecord", updatedRecord);
      } else {
        updatedRecord = await ApplicationModel.findByIdAndUpdate(
          applicationId,
          {
            $set: {
              ...req.body,
              requestedPhase: 3,
              phase: 3,
              phaseStatus: "pending",
              "phase1.applicationType": req.body.phase3.companyHelpService,
            },
            $push: {
              service: {
                serviceType: req.body.phase3.companyHelpService,
                dateTime: new Date(),
              },
            },
          },
          { new: true, useFindAndModify: false }
        );
      }

      // Send email to the user
      const url = `${process.env.BASE_URL}`;
      let html;
      if (!req.body.phase3.doesCompanyHelp) {
        let content = "Phase 2 Rejected";

        // Find Chat
        const chat = await ChatModel.findOne({
          applicationId: applicationId,
        });
        if (chat) {
          // Append Approved Phase Message
          const newMessage = new MessageModel({
            sender: req.userId.toString(),
            content: content,
            chatId: chat?._id,
            isPhaseRejectMessage: true,
            redirect: "/",
          });
          const approveMsg = await newMessage.save();
          console.log(approveMsg);

          // Update Latest Message
          await ChatModel.findByIdAndUpdate(chat?._id, {
            latestMessage: content,
          });
        }
        html = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title></title>
          </head>
          <body
            style="
              width: 100%;
              height: 95vh;
              background-color: #f6f9fc;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: sans-serif;
            "
          >
            <div
              class="card"
              style="
                width: 70%;
                height: 90%;
                background-color: #fff;
                border-radius: 10px;
                padding: 30px;
                margin-top: 2rem;
                padding-left: 40px;
                margin: 2rem auto;
              "
            >
              <img
                src=${logo}
                alt=""
                style="margin-left: auto; margin-right: auto"
              />
              <h3
                style="
                  color:#5D982E;
                  font-weight: 800;
                  font-size: 1.1rem;
                  letter-spacing: 0.5px;
                "
              >
                Phase 2 Rejected
              </h3>

              <p
              style="
                color: #414552 !important;
                font-weight: 400;
                font-size: 15px;
                line-height: 24px;
                margin-top: 1rem;
                max-width: 80%;
              "
            >
              Dear ${user?.name},
            </p>

            <p
            style="
              color: #414552 !important;
              font-weight: 400;
              font-size: 14px;
              line-height: 22px;
              margin-top: 1rem;
              max-width: 90%;
            "
          >
            Dear Customer your submission of phase 2 has been rejected.
          </p>

          <p
          style="
            color: #414552 !important;
            font-weight: 400;
            font-size: 14px;
            line-height: 22px;
            margin-top: 1rem;
            max-width: 80%;
          "
        >
         Best regards,
          Uk Immigration
        </p>
              <a
                style="margin-top: 1.5rem; cursor: pointer"
                href=${url}
                target="_blank"
                ><button
                  style="
                    width: 10.4rem;
                    height: 2.8rem;
                    border-radius: 8px;
                    outline: none;
                    border: none;
                    color: #fff;
                    background-color:#5D982E;
                    font-weight: 600;
                    font-size: 1.05rem;
                    cursor: pointer;
                  "
                >
                login
                </button></a
              >

              <p
                style="
                  color: #414552 !important;
                  font-weight: 400;
                  font-size: 16px;
                  line-height: 24px;
                  max-width: 88%;
                  margin-top: 6rem;
                "
              >
              All rights reserved by UK Immigration © 2023.
              </p>
            </div>
          </body>
        </html>`;
      } else {
        let content =
          "Congratulations, Phase 2 Approved Successfully. Click here to continue";

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
        html = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title></title>
          </head>
          <body
            style="
              width: 100%;
              height: 95vh;
              background-color: #f6f9fc;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: sans-serif;
            "
          >
            <div
              class="card"
              style="
                width: 70%;
                height: 90%;
                background-color: #fff;
                border-radius: 10px;
                padding: 30px;
                margin-top: 2rem;
                padding-left: 40px;
                margin: 2rem auto;
              "
            >
              <img
                src=${logo}
                alt=""
                style="margin-left: auto; margin-right: auto"
              />
              <h3
                style="
                  color:#5D982E;
                  font-weight: 800;
                  font-size: 1.1rem;
                  letter-spacing: 0.5px;
                "
              >
                Approval of UK Immigration Phase 2
              </h3>

              <p
              style="
                color: #414552 !important;
                font-weight: 400;
                font-size: 15px;
                line-height: 24px;
                margin-top: 1rem;
                max-width: 80%;
              "
            >
              Dear ${user?.name},
            </p>

            <p
            style="
              color: #414552 !important;
              font-weight: 400;
              font-size: 14px;
              line-height: 22px;
              margin-top: 1rem;
              max-width: 90%;
            "
          >
            We are pleased to inform you that your first
            phase of the UK immigration application process has been approved. To
            continue with the next phase, please log in to your account on our
            immigration portal and complete the required information for the third
            phase. Ensure all necessary fields are accurately filled out before
            submitting your application. Your login details remain the same as
            previously provided. If you encounter any issues or require assistance
            during this phase, please don't hesitate to contact our support team at
            immigration@support.com. We appreciate your cooperation and prompt
            attention to this next stage of the process. We look forward to
            receiving your completed third phase submission.
          </p>

          <p
          style="
            color: #414552 !important;
            font-weight: 400;
            font-size: 14px;
            line-height: 22px;
            margin-top: 1rem;
            max-width: 80%;
          "
        >
         Best regards,
          Uk Immigration
        </p>
              <a
                style="margin-top: 1.5rem; cursor: pointer"
                href=${url}
                target="_blank"
                ><button
                  style="
                    width: 10.4rem;
                    height: 2.8rem;
                    border-radius: 8px;
                    outline: none;
                    border: none;
                    color: #fff;
                    background-color:#5D982E;
                    font-weight: 600;
                    font-size: 1.05rem;
                    cursor: pointer;
                  "
                >
                login
                </button></a
              >

              <p
                style="
                  color: #414552 !important;
                  font-weight: 400;
                  font-size: 16px;
                  line-height: 24px;
                  max-width: 88%;
                  margin-top: 6rem;
                "
              >
              All rights reserved by UK Immigration © 2023.
              </p>
            </div>
          </body>
        </html>`;
      }

      const info = await transporter.sendMail({
        from: {
          address: "testmailingsmtp@lesoft.io",
          name: "Lesoft",
        },
        to: user?.email,
        subject: "Approval of UK Immigration Phase 2",
        text: "",
        html: html,
      });

      if (info.messageId) {
        console.log("Email sent to the user", info.messageId);
      }
      return res.status(200).json({
        message: "Phase 3 Requested",
        data: updatedRecord,
        success: true,
      });
    } else if (
      application.phase === 2 &&
      application.phaseStatus === phaseStaus.Pending
    ) {
      // Pending Condition
      if (application.requestedPhase >= 2) {
        return res.status(400).json({
          message: "You have already requested this phase.",
          success: false,
        });
      }
    } else if (
      application.phase === 3 &&
      application.phaseStatus === phaseStaus.Pending
    ) {
      // Pending Condition
      if (application.requestedPhase >= 3) {
        return res.status(400).json({
          message: "You have already requested this phase.",
          success: false,
        });
      }
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Update Application Phases Data By Admin

const updatePhaseByAdmin = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { phase, data } = req.body;
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });

    if (phase === 1) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { $set: { phase1: data } },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }

    if (phase === 2) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { $set: { phase2: data } },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }

    if (phase === 3) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { $set: { phase3: data } },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }

    if (phase === 4) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { $set: { phase4: data } },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const ReRequestPhase1 = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res
        .status(400)
        .json({ message: "Application Id cannot be empty", success: false });
    }

    const application = await ApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        $set: {
          phaseSubmittedByClient: 0,
          reRequest: 1,
        },
      },
      { new: true, useFindAndModify: false }
    );

    if (application) {
      const user = await UserModel.findById(application?.userId);

      // Send email to the user
      const url = `${process.env.BASE_URL}`;
      const html = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title></title>
          </head>
          <body
            style="
              width: 100%;
              height: 95vh;
              background-color: #f6f9fc;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: sans-serif;
            "
          >
            <div
              class="card"
              style="
                width: 70%;
                height: 90%;
                background-color: #fff;
                border-radius: 10px;
                padding: 30px;
                margin-top: 2rem;
                padding-left: 40px;
                margin: 2rem auto;
              "
            >
              <img
                src=${logo}
                alt=""
                style="margin-left: auto; margin-right: auto"
              />
              <h3
                style="
                  color:#5D982E;
                  font-weight: 800;
                  font-size: 1.1rem;
                  letter-spacing: 0.5px;
                "
              >
                Request to Resubmit Phase 1 Data for Immigration Application
              </h3>

              <p
              style="
                color: #414552 !important;
                font-weight: 400;
                font-size: 15px;
                line-height: 24px;
                margin-top: 1rem;
                max-width: 80%;
              "
            >
              Dear ${user?.name},
            </p>

            <p
            style="
              color: #414552 !important;
              font-weight: 400;
              font-size: 14px;
              line-height: 22px;
              margin-top: 1rem;
              max-width: 90%;
            "
          >

    We are writing to inform you that your recently submitted Phase 1 data for your immigration application has been reviewed by our administrative team. Regrettably, we have identified some discrepancies that require your attention.

    In order to proceed with the processing of your application, we kindly request you to resubmit the Phase 1 data with the necessary corrections. Please carefully review the feedback provided by our team to address the specific issues mentioned.

    To facilitate the resubmission process, please log in to your account on our immigration portal and navigate to the "Phase 1 Submission" section. Once there, you will find the option to edit and update your information. Ensure that all the required fields are filled accurately and completely.

    If you encounter any difficulties or have questions regarding the corrections, please do not hesitate to reach out to our support team at [support@email.com]. We are here to assist you throughout the process and ensure a smooth experience.
          </p>

          <p
          style="
            color: #414552 !important;
            font-weight: 400;
            font-size: 14px;
            line-height: 22px;
            margin-top: 1rem;
            max-width: 80%;
          "
        >
         Best regards,
          Uk Immigration
        </p>
              <a
                style="margin-top: 1.5rem; cursor: pointer"
                href=${url}
                target="_blank"
                ><button
                  style="
                    width: 10.4rem;
                    height: 2.8rem;
                    border-radius: 8px;
                    outline: none;
                    border: none;
                    color: #fff;
                    background-color:#5D982E;
                    font-weight: 600;
                    font-size: 1.05rem;
                    cursor: pointer;
                  "
                >
                Login
                </button></a
              >

              <p
                style="
                  color: #414552 !important;
                  font-weight: 400;
                  font-size: 16px;
                  line-height: 24px;
                  max-width: 88%;
                  margin-top: 6rem;
                "
              >
              All rights reserved by UK Immigration © 2023.
              </p>
            </div>
          </body>
        </html>`;
      const info = await transporter.sendMail({
        from: {
          address: "testmailingsmtp@lesoft.io",
          name: "Lesoft",
        },
        to: user?.email,
        subject: "Request to Resubmit Phase 1 Data for Immigration Application",
        text: "",
        html: html,
      });

      if (info.messageId) {
        console.log("Email sent to the user", info.messageId);
      }

      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const ReRequestPhase4 = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res
        .status(400)
        .json({ message: "Application Id cannot be empty", success: false });
    }

    const application = await ApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        $set: {
          phaseSubmittedByClient: 3,
          reRequest: 4,
        },
      },
      { new: true, useFindAndModify: false }
    );

    if (application) {
      const user = await UserModel.findById(application?.userId);

      // Send email to the user
      const url = `${process.env.BASE_URL}`;
      const html = `<!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title></title>
            </head>
            <body
              style="
                width: 100%;
                height: 95vh;
                background-color: #f6f9fc;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: sans-serif;
              "
            >
              <div
                class="card"
                style="
                  width: 70%;
                  height: 90%;
                  background-color: #fff;
                  border-radius: 10px;
                  padding: 30px;
                  margin-top: 2rem;
                  padding-left: 40px;
                  margin: 2rem auto;
                "
              >
                <img
                  src=${logo}
                  alt=""
                  style="margin-left: auto; margin-right: auto"
                />
                <h3
                  style="
                    color:#5D982E;
                    font-weight: 800;
                    font-size: 1.1rem;
                    letter-spacing: 0.5px;
                  "
                >
                  Request to Resubmit Phase 4 Data for Immigration Application
                </h3>

                <p
                style="
                  color: #414552 !important;
                  font-weight: 400;
                  font-size: 15px;
                  line-height: 24px;
                  margin-top: 1rem;
                  max-width: 80%;
                "
              >
                Dear ${user?.name},
              </p>

              <p
              style="
                color: #414552 !important;
                font-weight: 400;
                font-size: 14px;
                line-height: 22px;
                margin-top: 1rem;
                max-width: 90%;
              "
            >

      We are writing to inform you that your recently submitted Phase 4 data for your immigration application has been reviewed by our administrative team. Regrettably, we have identified some discrepancies that require your attention.

      In order to proceed with the processing of your application, we kindly request you to resubmit the Phase 4 data with the necessary corrections. Please carefully review the feedback provided by our team to address the specific issues mentioned.

      To facilitate the resubmission process, please log in to your account on our immigration portal and navigate to the "Phase 4 Submission" section. Once there, you will find the option to edit and update your information. Ensure that all the required fields are filled accurately and completely.

      If you encounter any difficulties or have questions regarding the corrections, please do not hesitate to reach out to our support team at [support@email.com]. We are here to assist you throughout the process and ensure a smooth experience.
            </p>

            <p
            style="
              color: #414552 !important;
              font-weight: 400;
              font-size: 14px;
              line-height: 22px;
              margin-top: 1rem;
              max-width: 80%;
            "
          >
           Best regards,
            Uk Immigration
          </p>
                <a
                  style="margin-top: 1.5rem; cursor: pointer"
                  href=${url}
                  target="_blank"
                  ><button
                    style="
                      width: 10.4rem;
                      height: 2.8rem;
                      border-radius: 8px;
                      outline: none;
                      border: none;
                      color: #fff;
                      background-color:#5D982E;
                      font-weight: 600;
                      font-size: 1.05rem;
                      cursor: pointer;
                    "
                  >
                  Login
                  </button></a
                >

                <p
                  style="
                    color: #414552 !important;
                    font-weight: 400;
                    font-size: 16px;
                    line-height: 24px;
                    max-width: 88%;
                    margin-top: 6rem;
                  "
                >
                All rights reserved by UK Immigration © 2023.
                </p>
              </div>
            </body>
          </html>`;
      const info = await transporter.sendMail({
        from: {
          address: "testmailingsmtp@lesoft.io",
          name: "Lesoft",
        },
        to: user?.email,
        subject: "Request to Resubmit Phase 4 Data for Immigration Application",
        text: "",
        html: html,
      });

      if (info.messageId) {
        console.log("Email sent to the user", info.messageId);
      }

      res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// const getApplicationData = async (req, res) => {
//   try {
//     const application = await ApplicationModel.find({});
//     res.status(200).json({ application, success: true });
//   } catch (err) {
//     res.status(500).json({ message: err.message, success: false });
//   }
// };

const getApplicationData = async (req, res) => {
  try {
    const applications = await ApplicationModel.find({});

    const applicationsWithUserData = [];

    for (const application of applications) {
      const userId = application.userId;
      const user = await UserModel.findById(userId);

      // If a user is found, add user information to the application
      if (user) {
        const applicationDataWithUser = {
          ...application.toObject(), // Convert application to a plain JavaScript object
          user: {
            name: user.name,
            email: user.email,
            profilePic: user.profilePic,
          },
        };
        applicationsWithUserData.push(applicationDataWithUser);
      }
    }

    console.log(applicationsWithUserData);

    const extractData = {
      _id: applicationsWithUserData._id,
      user: applicationsWithUserData.user,
      phase: applicationsWithUserData.phase,
      phaseStatus: applicationsWithUserData.phaseStatus,
      userId: applicationsWithUserData.userId,
    };

    res
      .status(200)
      .json({ applications: applicationsWithUserData, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const getApplicationsNotesData = async (req, res) => {
  try {
    let applications;
    let groupClient;

    const isAdmin = await UserModel.findById(req.userId.toString());
    if (isAdmin.isAdmin) {
      applications = await ApplicationModel.find({});
      groupClient = await CompanyClientModel.find({});
    } else {
      applications = await ApplicationModel.find({
        caseWorkerId: req.userId.toString(),
      });
      groupClient = await CompanyClientModel.find({
        caseWorkerId: req.userId.toString(),
      });
    }

    const applicationsWithUserData = [];

    for (const application of applications) {
      const userId = application.userId;
      const user = await UserModel.findById(userId);

      // If a user is found, add user information to the application
      if (user) {
        const applicationDataWithUser = {
          ...application.toObject(), // Convert application to a plain JavaScript object
          user: {
            name: user.name,
            email: user.email,
            profilePic: user.profilePic,
          },
        };
        applicationsWithUserData.push(applicationDataWithUser);
      }
    }

    for (const application of groupClient) {
      const userId = application.userId;
      console.log("application", application);
      if (application.phaseSubmittedByClient >= 1) {
        const user = await UserModel.findById(userId);

        // If a user is found, add user information to the application
        if (user) {
          const applicationDataWithUser = {
            ...application.toObject(), // Convert application to a plain JavaScript object
            user: {
              name: user.name,
              email: user.email,
              profilePic: user.profilePic,
            },
          };
          applicationsWithUserData.push(applicationDataWithUser);
        }
      }
    }

    console.log(applicationsWithUserData);

    const extractData = {
      _id: applicationsWithUserData._id,
      user: applicationsWithUserData.user,
      phase: applicationsWithUserData.phase,
      phaseStatus: applicationsWithUserData.phaseStatus,
      userId: applicationsWithUserData.userId,
    };

    res
      .status(200)
      .json({ applications: applicationsWithUserData, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const getApplicationNotification = async (req, res) => {
  try {
    const applications = await ApplicationModel.find({}).select({
      _id: true,
      phase: true,
      phaseStatus: true,
      userId: true,
      applicationStatus: true,
      phaseSubmittedByClient: true,
    });

    // Create an array to store the application data with user information
    const applicationsWithUserData = [];

    // Iterate through each application
    for (const application of applications) {
      const userId = application.userId;
      const user = await UserModel.findById(userId); // Assuming you have a UserModel

      // Check if a user with the given userId exists
      if (user) {
        const applicationDataWithUser = {
          ...application.toObject(), // Convert application to a plain JavaScript object
          user: {
            name: user.name,
            email: user.email,
            profilePic: user.profilePic,
          },
        };
        applicationsWithUserData.push(applicationDataWithUser);
      } else {
        // Handle the case where no matching user is found
        applicationsWithUserData.push(application.toObject()); // Add application data without user information
      }
    }

    res
      .status(200)
      .json({ applications: applicationsWithUserData, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const getApplicationDataById = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await ApplicationModel.findById(applicationId);
    res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const getApplicationByUserId = async (req, res) => {
  try {
    const application = await ApplicationModel.findOne({
      userId: req.userId.toString(),
    });
    res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const getApplicationDataByUser = async (req, res) => {
  try {
    const application = await ApplicationModel.find({}).select({
      "phase1.name": true,
      "phase1.applicationType": true,
      applicationStatus: true,
    });
    res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const updateApplicationData = async (req, res) => {
  try {
    const { applicationId } = req.body;
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }
    await ApplicationModel.updateOne({
      _id: applicationId,
      ...req.body,
    });
    res
      .status(200)
      .json({ message: "Application Updated Successfully", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const rejectApplication = async (req, res) => {
  try {
    const { applicationId, rejectPhaseReason } = req.body;
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id.",
        success: false,
      });
    }

    if (isApplication.phase === 1) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        {
          $set: {
            applicationStatus: "rejected",
            phaseStatus: "rejected",
            rejectPhaseReason: rejectPhaseReason,
            "phase1.status": "rejected",
            requestedPhase:
              isApplication.requestedPhase === 2
                ? 0
                : isApplication.requestedPhase === 3
                ? 2
                : 0,
          },
          $push: {
            report: {
              phase: isApplication.phase,
              status: "rejected",
              dateTime: new Date(),
            },
          },
        }
      );
    } else if (isApplication.phase === 2) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        {
          $set: {
            applicationStatus: "rejected",
            phaseStatus: "rejected",
            rejectPhaseReason: rejectPhaseReason,
            "phase2.status": "rejected",
            requestedPhase:
              isApplication.requestedPhase === 2
                ? 0
                : isApplication.requestedPhase === 3
                ? 2
                : 0,
          },
          $push: {
            report: {
              phase: isApplication.phase,
              status: "rejected",
              dateTime: new Date(),
            },
          },
        }
      );
    } else if (isApplication.phase === 3) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        {
          $set: {
            applicationStatus: "rejected",
            phaseStatus: "rejected",
            rejectPhaseReason: rejectPhaseReason,
            "phase3.status": "rejected",
            requestedPhase:
              isApplication.requestedPhase === 2
                ? 0
                : isApplication.requestedPhase === 3
                ? 2
                : 0,
          },
          $push: {
            report: {
              phase: isApplication.phase,
              status: "rejected",
              dateTime: new Date(),
            },
          },
        }
      );
    } else if (isApplication.phase === 4) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        {
          $set: {
            applicationStatus: "rejected",
            phaseStatus: "rejected",
            rejectPhaseReason: rejectPhaseReason,
            "phase4.status": "rejected",
            requestedPhase:
              isApplication.requestedPhase === 2
                ? 0
                : isApplication.requestedPhase === 3
                ? 2
                : 0,
          },
          $push: {
            report: {
              phase: isApplication.phase,
              status: "rejected",
              dateTime: new Date(),
            },
          },
        }
      );
    }

    let content = rejectPhaseReason;

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

    res.status(200).json({ message: "Application Rejected", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Search Filter Application
// const filterApplication = async (req, res) => {
//   try {
//     const queryConditions = [];
//     const { filters } = req.body;

//     console.log(filters.birthDate);

//     if (filters.name) {
//       queryConditions.push({
//         "phase1.name": { $regex: new RegExp(filters.name, "i") },
//       });
//     }

//     if (filters.caseId) {
//       queryConditions.push({
//         caseId: { $regex: new RegExp(filters.caseId, "i") },
//       });
//     }

//     if (filters.country) {
//       queryConditions.push({
//         "phase1.country": { $regex: new RegExp(filters.country, "i") },
//       });
//     }

//     if (filters.birthDate) {
//       // Convert the string date to a JavaScript Date object
//       const birthDate = new Date(filters.birthDate);

//       // Create a range for birthDate filtering (e.g., matching on the exact date)
//       const startDate = new Date(birthDate);
//       const endDate = new Date(birthDate);
//       endDate.setDate(endDate.getDate() + 1); // Add one day to include the whole day

//       queryConditions.push({
//         "phase1.birthDate": { $gte: startDate, $lt: endDate },
//       });
//     }

//     console.log(queryConditions);

//     const query =
//       queryConditions.length === 1
//         ? { $or: queryConditions }
//         : queryConditions.length > 1
//         ? { $and: queryConditions }
//         : {};

//     const result = await ApplicationModel.find(query).select({
//       "phase1.name": true,
//       "phase1.email": true,
//       "phase1.contact": true,
//       "phase1.birthDate": true,
//       "phase1.country": true,
//       caseId: true,
//       "phase1.applicationType": true,
//       applicationStatus: true,
//     });

//     res.status(200).json({ result, success: true });
//   } catch (error) {
//     res.status(500).json(error);
//   }
// };

const generateQueryConditions = (filters, modelName, caseWorkerId) => {
  const queryConditions = [];

  if (caseWorkerId) {
    const nameField =
      modelName === "ApplicationModel" ? "caseWorkerId" : "caseWorkerId";
    queryConditions.push({
      [nameField]: { $regex: new RegExp(caseWorkerId, "i") },
    });
  }

  if (filters.name) {
    const nameField =
      modelName === "ApplicationModel"
        ? "phase1.name"
        : "phase1.fullNameAsPassport";
    queryConditions.push({
      [nameField]: { $regex: new RegExp(filters.name, "i") },
    });
  }

  if (filters.caseId) {
    queryConditions.push({
      caseId: { $regex: new RegExp(filters.caseId, "i") },
    });
  }

  if (filters.country) {
    const countryField =
      modelName === "ApplicationModel"
        ? "phase1.country"
        : "phase1.nationality";
    queryConditions.push({
      [countryField]: { $regex: new RegExp(filters.country, "i") },
    });
  }

  if (filters.birthDate) {
    // Convert the string date to a JavaScript Date object
    const birthDate = new Date(filters.birthDate);

    // Create a range for birthDate filtering (e.g., matching on the exact date)
    const startDate = new Date(birthDate);
    const endDate = new Date(birthDate);
    endDate.setDate(endDate.getDate() + 1); // Add one day to include the whole day

    const birthDateField =
      modelName === "ApplicationModel"
        ? "phase1.birthDate"
        : "phase1.birthDate"; // Adjust field name
    queryConditions.push({
      [birthDateField]: { $gte: startDate, $lt: endDate },
    });
  }

  return queryConditions;
};

const filterApplication = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId.toString());
    let caseWorkerId;
    if (user.isCaseWorker) {
      caseWorkerId = user._id;
    }
    const { filters } = req.body;
    const applicationQueryConditions = generateQueryConditions(
      filters,
      "ApplicationModel",
      caseWorkerId
    );
    const companyClientQueryConditions = generateQueryConditions(
      filters,
      "CompanyClientApplication",
      caseWorkerId
    );

    const applicationQuery =
      applicationQueryConditions.length === 1
        ? { $or: applicationQueryConditions }
        : applicationQueryConditions.length > 1
        ? { $and: applicationQueryConditions }
        : {};

    const companyClientQuery =
      companyClientQueryConditions.length === 1
        ? { $or: companyClientQueryConditions }
        : companyClientQueryConditions.length > 1
        ? { $and: companyClientQueryConditions }
        : {};

    const applicationResult = await ApplicationModel.find(
      applicationQuery
    ).select({
      "phase1.name": true,
      "phase1.email": true,
      "phase1.contact": true,
      "phase1.birthDate": true,
      "phase1.country": true,
      caseId: true,
      "phase1.applicationType": true,
      applicationStatus: true,
    });

    const companyClientResult = await CompanyClientModel.find(
      companyClientQuery
    ).select({
      "phase1.fullNameAsPassport": true,
      "phase1.birthDate": true,
      "phase1.nationality": true,
      "phase1.companyContact": true,
      "phase1.clientContact": true,
      caseId: true,
      "phase1.applicationType": true,
      applicationStatus: true,
      companyId: true,
    });

    const result = [...applicationResult, ...companyClientResult];
    console.log("result", result);

    res.status(200).json({ result, success: true });
  } catch (error) {
    res.status(500).json(error);
  }
};

// Add Note to Application By Admin
const addNotes = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { name, content } = req.body;
    console.log(req.body);
    const notes = { name: name, content: content, dateTime: new Date() };
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
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
    const { applicationId, caseWorkerId, caseWorkerName } = req.body;
    const caseWorker = await UserModel.findById(caseWorkerId);
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id.",
        success: false,
      });
    }
    const data = await ApplicationModel.updateOne(
      { _id: applicationId },
      {
        $set: {
          isCaseWorkerHandling: true,
          caseWorkerId: caseWorkerId,
          caseWorkerName: caseWorkerName,
        },
      }
    );

    const user = await UserModel.updateOne(
      { _id: isApplication.userId },
      {
        $set: {
          referringAgent: caseWorkerId,
        },
      }
    );

    // Add This CaseWorker ID to Chat
    const chat = await ChatModel.updateOne(
      { applicationId: applicationId },
      { $addToSet: { users: caseWorkerId } },
      { new: true, useFindAndModify: false }
    );

    // Send email to the user
    const url = `${process.env.BASE_URL}`;
    const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title></title>
      </head>
      <body
        style="
          width: 100%;
          height: 95vh;
          background-color: #f6f9fc;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: sans-serif;
        "
      >
        <div
          class="card"
          style="
            width: 70%;
            height: 85%;
            background-color: #fff;
            border-radius: 10px;
            padding: 30px;
            margin-top: 2rem;
            padding-left: 40px;
            margin: 2rem auto;
          "
        >
          <img
            src=${logo}
            alt=""
            style="margin-left: auto; margin-right: auto"
          />
          <h3
            style="
              color:#5D982E;
              font-weight: 800;
              font-size: 1.1rem;
              letter-spacing: 0.5px;
            "
          >
            Approval of UK Immigration Phase 3
          </h3>

          <p
          style="
            color: #414552 !important;
            font-weight: 400;
            font-size: 15px;
            line-height: 22px;
            margin-top: 1rem;
            max-width: 90%;
          "
        >
          Dear ${caseWorkerName},
        </p>

        <p
        style="
          color: #414552 !important;
          font-weight: 400;
          font-size: 14px;
          line-height: 22px;
          margin-top: 1rem;
          max-width: 90%;
        "
      >
I hope this message finds you well. We would like to inform you that a new case has been assigned to you in our system. As a dedicated member of our team, we trust you to manage this case with the same level of professionalism and diligence you've consistently demonstrated.

Here are the details of the new case:

Case ID: ${isApplication.caseId}
Service Type: ${isApplication?.phase1?.applicationType}
Client Name: ${isApplication?.phase1?.name}
Please log in to your account on the admin panel to access the full details and take appropriate action. If you have any questions or require additional information, feel free to reach out to the admin team at [Admin Team Email/Contact].

Your prompt attention to this matter is greatly appreciated. Thank you for your continued dedication to our mission.
      </p>

      <p
      style="
        color: #414552 !important;
        font-weight: 400;
        font-size: 15px;
        line-height: 22px;
        margin-top: 1rem;
        max-width: 80%;
      "
    >
     Best regards,
     Uk Immigration
    </p>

          <a
            style="margin-top: 1.5rem; cursor: pointer"
            href=${url}
            target="_blank"
            ><button
              style="
                width: 10.4rem;
                height: 2.8rem;
                border-radius: 8px;
                outline: none;
                border: none;
                color: #fff;
                background-color:#5D982E;
                font-weight: 600;
                font-size: 1.05rem;
                cursor: pointer;
              "
            >
            Login
            </button></a
          >

          <p
            style="
              color: #414552 !important;
              font-weight: 400;
              font-size: 16px;
              line-height: 24px;
              max-width: 88%;
              margin-top: 6rem;
            "
          >
          All rights reserved by UK Immigration © 2023.
          </p>
        </div>
      </body>
    </html>`;
    const info = await transporter.sendMail({
      from: {
        address: "testmailingsmtp@lesoft.io",
        name: "Lesoft",
      },
      to: caseWorker.email,
      subject: "New Case Assignment: Action Required",
      text: "",
      html: html,
    });

    if (info.messageId) {
      console.log("Email sent to the user", info.messageId);
    }

    res
      .status(200)
      .json({ message: "CaseWorker Assigned", data, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Get Invoice Details
const getInvoiceDetails = async (req, res) => {
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
};

const generateInvoiceQueryConditions = (filters, modelName, caseWorkerId) => {
  const queryConditions = [];

  if (caseWorkerId) {
    const nameField =
      modelName === "ApplicationModel" ? "caseWorkerId" : "caseWorkerId";
    queryConditions.push({
      [nameField]: { $regex: new RegExp(caseWorkerId, "i") },
    });
  }

  // Validate that Requested phase should be grater or equal to 3
  queryConditions.push({
    phase: {
      $gte: 3,
    },
  });

  if (filters.name) {
    const nameField =
      modelName === "ApplicationModel"
        ? "phase1.name"
        : "phase1.fullNameAsPassport";
    queryConditions.push({
      [nameField]: { $regex: new RegExp(filters.name, "i") },
    });
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
    queryConditions.push({
      "phase3.dateTime": {
        $gte: new Date(filters.from),
        $lte: new Date(filters.to),
      },
    });
  } else if (filters.from) {
    queryConditions.push({
      "phase3.dateTime": {
        $gte: new Date(filters.from),
      },
    });
  } else if (filters.to) {
    queryConditions.push({
      "phase3.dateTime": {
        $lte: new Date(filters.to),
      },
    });
  }

  return queryConditions;
};

const filterInvoices = async (req, res) => {
  try {
    const { filters } = req.body;

    const user = await UserModel.findById(req.userId.toString());
    let caseWorkerId;
    if (user.isCaseWorker) {
      caseWorkerId = user._id;
    }

    const applicationQueryConditions = generateInvoiceQueryConditions(
      filters,
      "ApplicationModel",
      caseWorkerId
    );
    const companyClientQueryConditions = generateInvoiceQueryConditions(
      filters,
      "CompanyClientModel",
      caseWorkerId
    );

    const applicationQuery =
      applicationQueryConditions.length === 1
        ? { $or: applicationQueryConditions }
        : applicationQueryConditions.length > 1
        ? { $and: applicationQueryConditions }
        : {};

    const companyClientQuery =
      companyClientQueryConditions.length === 1
        ? { $or: companyClientQueryConditions }
        : companyClientQueryConditions.length > 1
        ? { $and: companyClientQueryConditions }
        : {};

    const applicationResult = await ApplicationModel.find(
      applicationQuery
    ).select({
      caseId: true,
      "phase1.name": true,
      "phase1.applicationType": true,
      caseWorkerId: true,
      caseWorkerName: true,
      "phase3.dateTime": true,
      "phase3.cost": true,
      "phase3.isPaid": true,
      "phase3.isOnlinePayment": true,
      "phase3.onlinePaymentEvidence": true,
      "phase3.paymentEvidence": true,
    });

    const companyClientResult = await CompanyClientModel.find(
      companyClientQuery
    ).select({
      caseId: true,
      "phase1.fullNameAsPassport": true,
      "phase1.applicationType": true,
      caseWorkerId: true,
      caseWorkerName: true,
      "phase3.dateTime": true,
      "phase3.cost": true,
      "phase3.isPaid": true,
      "phase3.isOnlinePayment": true,
      "phase3.onlinePaymentEvidence": true,
      "phase3.paymentEvidence": true,
    });

    const result = [...applicationResult, ...companyClientResult];

    res.status(200).json({ result, success: true });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

// Search Filter Invoices of Application
// const filterInvoices = async (req, res) => {
//   try {
//     const queryConditions = [];
//     const { filters } = req.body;
//     console.log(req.body);
//     if (filters.name) {
//       queryConditions.push({
//         "phase1.name": { $regex: new RegExp(filters.name, "i") },
//       });
//     }

//     if (filters.applicationType) {
//       queryConditions.push({
//         "phase1.applicationType": {
//           $regex: new RegExp(filters.applicationType, "i"),
//         },
//       });
//     }

//     if (filters.caseWorkerId) {
//       queryConditions.push({
//         caseWorkerId: { $regex: new RegExp(filters.caseWorkerId, "i") },
//       });
//     }

//     if (filters.from && filters.to) {
//       // Filter by date range using $gte and $lte operators
//       queryConditions.push({
//         "phase3.dateTime": {
//           $gte: new Date(filters.from),
//           $lte: new Date(filters.to),
//         },
//       });
//     } else if (filters.from) {
//       // Filter by "from" date using $gte operator
//       queryConditions.push({
//         "phase3.dateTime": {
//           $gte: new Date(filters.from),
//         },
//       });
//     } else if (filters.to) {
//       // Filter by "to" date using $lte operator
//       queryConditions.push({
//         "phase3.dateTime": {
//           $lte: new Date(filters.to),
//         },
//       });
//     }

//     const query =
//       queryConditions.length === 1
//         ? { $or: queryConditions }
//         : queryConditions.length > 1
//         ? { $and: queryConditions }
//         : {};
//     const result = await ApplicationModel.find(query).select({
//       caseId: true,
//       "phase1.name": true,
//       "phase1.applicationType": true,
//       caseWorkerId: true,
//       caseWorkerName: true,
//       "phase3.dateTime": true,
//       "phase3.cost": true,
//       "phase3.isPaid": true,
//     });

//     // const query =
//     //   queryConditions.length === 1
//     //     ? { $or: queryConditions }
//     //     : queryConditions.length > 1
//     //     ? { $and: queryConditions }
//     //     : {};
//     // console.log(query);
//     // const result = await ApplicationModel.aggregate([
//     //   {
//     //     $addFields: {
//     //       convertedId: { $toObjectId: "$caseWorkerId" },
//     //     },
//     //   },
//     //   {
//     //     $match: query,
//     //   },
//     //   {
//     //     $lookup: {
//     //       from: "users",
//     //       localField: "convertedId",
//     //       foreignField: "_id",
//     //       as: "caseWorker",
//     //     },
//     //   },
//     //   {
//     //     $unwind: "$caseWorker",
//     //   },
//     //   {
//     //     $project: {
//     //       caseId: true,
//     //       "phase1.name": true,
//     //       "phase1.applicationType": true,
//     //       caseWorkerId: true,
//     //       "phase3.dateTime": true,
//     //       "phase3.cost": true,
//     //       "phase3.isPaid": true,
//     //       caseWorkerName: "$caseWorker.name",
//     //     },
//     //   },
//     // ]);

//     res.status(200).json({ result, success: true });
//   } catch (error) {
//     res.status(500).json({ message: err.message, success: false });
//   }
// };

// Link Company With Client Application
const linkCompany = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { companyId, name } = req.body;

    if (!companyId || !name || !applicationId) {
      return res.status(400).json({
        message: "Please fill out all required fields",
        success: false,
      });
    }

    const application = await ApplicationModel.findByIdAndUpdate(
      { _id: applicationId },
      { linkedCompany: { companyId, name } },
      { new: true, useFindAndModify: false }
    );

    res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const arrayFileUploads = async (req, res) => {
  try {
    // const { applicationId } = req.params;
    const files = req.files;
    console.log("Files", files);
    const filesObj = {};

    res.send(files);
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};

const finalApplicationConfirmation = async (req, res) => {
  try {
    const { description, isApprove } = req.body;
    const { applicationId } = req.params;
    let status;
    if (isApprove === "true") {
      status = "approved";
    } else {
      status = "rejected";
    }

    const files = req.files;
    if (!description) {
      return res.status(400).json({
        message: "Please enter description",
      });
    }

    const pdfFile = `/Uploads/${files?.pdf[0]?.filename}`;

    // Update Application
    const application = await ApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        $set: {
          "finalConfirmation.pdf": pdfFile,
          "finalConfirmation.description": description,
          "finalConfirmation.status": status,
          $push: {
            report: {
              phase: 4,
              status: "approved",
              dateTime: new Date(),
            },
          },
        },
      },
      { new: true, useFindAndModify: false }
    );

    const user = await UserModel.findById(application.userId);

    // Send email to the user
    const url = `${process.env.BASE_URL}`;
    let html;

    if (isApprove === "true") {
      html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
  </head>
  <body
    style="
      width: 100%;
      height: 95vh;
      background-color: #f6f9fc;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: sans-serif;
    "
  >
    <div
      class="card"
      style="
        width: 70%;
        height: 85%;
        background-color: #fff;
        border-radius: 10px;
        padding: 30px;
        margin-top: 2rem;
        padding-left: 40px;
        margin: 2rem auto;
      "
    >
      <img
        src=${logo}
        alt=""
        style="margin-left: auto; margin-right: auto"
      />
      <h3
        style="
          color:#5D982E;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 0.5px;
        "
      >
        Approval of UK Immigration Phase 4
      </h3>


      <p
      style="
        color: #414552 !important;
        font-weight: 400;
        font-size: 15px;
        line-height: 22px;
        margin-top: 1rem;
        max-width: 90%;
      "
    >
      Dear ${user?.name}, 
    </p>

    <p
    style="
      color: #414552 !important;
      font-weight: 400;
      font-size: 12px;
      line-height: 22px;
      margin-top: 1rem;
      max-width: 90%;
    "
  >
    We are delighted to inform you that your application has successfully cleared the final step with the authorities. It is with great pleasure that we extend our congratulations to you.

Your hard work and dedication throughout this process have truly paid off. We are here to support you every step of the way as you move forward.

Please feel free to reach out if you have any questions or need further assistance. Once again, congratulations on this significant achievement!
  </p>
  
  <p
  style="
    color: #414552 !important;
    font-weight: 400;
    font-size: 18px;
    line-height: 24px;
    margin-top: 1rem;
    max-width: 80%;
  "
>
 Best regards,
  Uk Immigration
</p>
      <a
        style="margin-top: 1.5rem; cursor: pointer"
        href=${url}
        target="_blank"
        ><button
          style="
            width: 10.4rem;
            height: 2.8rem;
            border-radius: 8px;
            outline: none;
            border: none;
            color: #fff;
            background-color:#5D982E;
            font-weight: 600;
            font-size: 1.05rem;
            cursor: pointer;
          "
        >
        login
        </button></a
      >

      <p
        style="
          color: #414552 !important;
          font-weight: 400;
          font-size: 16px;
          line-height: 24px;
          max-width: 88%;
          margin-top: 6rem;
        "
      >
      All rights reserved by UK Immigration © 2023.
      </p>
    </div>
  </body>
</html>`;
    } else {
      html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
  </head>
  <body
    style="
      width: 100%;
      height: 95vh;
      background-color: #f6f9fc;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: sans-serif;
    "
  >
    <div
      class="card"
      style="
        width: 70%;
        height: 85%;
        background-color: #fff;
        border-radius: 10px;
        padding: 30px;
        margin-top: 2rem;
        padding-left: 40px;
        margin: 2rem auto;
      "
    >
      <img
        src=${logo}
        alt=""
        style="margin-left: auto; margin-right: auto"
      />
      <h3
        style="
          color:#5D982E;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 0.5px;
        "
      >
        Approval of UK Immigration Phase 4
      </h3>


      <p
      style="
        color: #414552 !important;
        font-weight: 400;
        font-size: 15px;
        line-height: 22px;
        margin-top: 1rem;
        max-width: 90%;
      "
    >
      Dear ${user?.name}, 
    </p>

    <p
    style="
      color: #414552 !important;
      font-weight: 400;
      font-size: 12px;
      line-height: 22px;
      margin-top: 1rem;
      max-width: 90%;
    "
  >
    We regret to inform you that your application has been rejected by the authorities. We understand that this may be disappointing news, and we want to assure you that we are here to support you during this time.

Although this outcome is not what we had hoped for, please know that it does not diminish the value of your efforts and dedication. We remain committed to assisting you in any way we can and exploring alternative options to achieve your goals.

If you have any questions or would like further clarification on the decision, please do not hesitate to reach out to us. We are here to provide guidance and assistance as you navigate this situation.

Thank you for your understanding and cooperation.
  </p>
  
  <p
  style="
    color: #414552 !important;
    font-weight: 400;
    font-size: 18px;
    line-height: 24px;
    margin-top: 1rem;
    max-width: 80%;
  "
>
 Best regards,
  Uk Immigration
</p>
      <a
        style="margin-top: 1.5rem; cursor: pointer"
        href=${url}
        target="_blank"
        ><button
          style="
            width: 10.4rem;
            height: 2.8rem;
            border-radius: 8px;
            outline: none;
            border: none;
            color: #fff;
            background-color:#5D982E;
            font-weight: 600;
            font-size: 1.05rem;
            cursor: pointer;
          "
        >
        login
        </button></a
      >

      <p
        style="
          color: #414552 !important;
          font-weight: 400;
          font-size: 16px;
          line-height: 24px;
          max-width: 88%;
          margin-top: 6rem;
        "
      >
      All rights reserved by UK Immigration © 2023.
      </p>
    </div>
  </body>
</html>`;
    }

    const info = await transporter.sendMail({
      from: {
        address: "testmailingsmtp@lesoft.io",
        name: "Lesoft",
      },
      to: user?.email,
      subject: "Update on Authority Confitmation",
      text: "",
      html: html,
    });
    
    return res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};

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
  linkCompany,
  getApplicationNotification,
  postGeneral,
  postAccomodation,
  postFamily,
  postLanguage,
  postEducation,
  postEmployment,
  postMaintenance,
  postTravel,
  postCharacter,
  updateApplicationService,
  postPhase1Manual,
  updatePhase1Manual,
  arrayFileUploads,
  getApplicationsNotesData,
  ReRequestPhase1,
  ReRequestPhase4,
  finalApplicationConfirmation,
};
