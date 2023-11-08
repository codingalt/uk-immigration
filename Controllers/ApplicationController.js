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
      const caseWorker = await UserModel.findOne({
        email: user.referringAgent,
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

    if (isApplicationAlready)
      return res
        .status(400)
        .json({ message: "Your Application already exists", success: false });

    const application = await new ApplicationModel(req.body).save();

    const admin = await UserModel.findOne({ isAdmin: true });

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
      height: 90vh;
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
        height: 71%;
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
        max-width: 80%;
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
    I hope this message finds you well. We are writing to inform you that one of our clients has successfully completed the initial phase of their UK immigration application process. We would like to request your attention to review and manage the application further.

Client Information:

Name: ${user.name}
Application ID: ${caseId}
Date of Submission: ${new Date("yyyy-MM-dd")} 
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
    if (!user.isAdmin) {
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

    if (user.isAdmin || user.isCaseWorkerHandling) {
      // Update Phase 2
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          $set: {
            phase2: filesObj,
            phaseSubmittedByClient: 2,
            phase: 2,
            phaseStatus: phaseStatus.Approved,
          },
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
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
};

const postApplicationPhase3 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    const files = req.files;
    const chalanFile = `/Uploads/${files.chalan[0].filename}`;
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

    if (!user.isAdmin || user.isCaseWorkerHandling) {
      if (isRequested.requestedPhase < 3) {
        return res.status(400).json({
          message:
            "You can't submit phase 3 data right now, Untill admin requests you to submit phase 3 data.",
        });
      }
    }

    if (user.isAdmin || user.isCaseWorkerHandling) {
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
            phaseStatus: phaseStatus.Approved,
          },
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
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

    if (user.isAdmin || user.isCaseWorkerHandling) {
      console.log("Admin condition");
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          ...req.body,
          phaseSubmittedByClient: 4,
          phase: 4,
          phaseStatus: "approved",
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { ...req.body, phaseSubmittedByClient: 4 },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
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

    console.log(req.body);

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

    req.body.userId = userData._id;
    req.body.caseId = caseId;
    req.body.phaseSubmittedByClient = 1;
    req.body.phase = 1;
    req.body.phaseStatus = "approved";
    req.body.isInitialRequestAccepted = true;
    req.body.isManual = true;
    // Check if application is already exist
    const isApplicationAlready = await ApplicationModel.findOne({
      userId: userData._id,
    });

    if (isApplicationAlready)
      return res
        .status(400)
        .json({ message: "Your Application already exists", success: false });

    const application = await new ApplicationModel(req.body).save();

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
    await UserModel.deleteOne({ _id: userData._id });
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
    if (user.isAdmin || user.isCaseWorkerHandling) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.general": req.body,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.general": req.body },
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
    if (user.isAdmin || user.isCaseWorkerHandling) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.accommodation": req.body,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.accommodation": req.body },
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
    if (user.isAdmin || user.isCaseWorkerHandling) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.family": req.body,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.family": req.body },
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
    if (user.isAdmin || user.isCaseWorkerHandling) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.languageProficiency": req.body,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.languageProficiency": req.body },
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
    if (user.isAdmin || user.isCaseWorkerHandling) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.education": req.body,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.education": req.body },
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
    if (user.isAdmin || user.isCaseWorkerHandling) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.employment": req.body,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.employment": req.body },
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
    if (user.isAdmin || user.isCaseWorkerHandling) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.maintenance": req.body,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.maintenance": req.body },
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
    if (user.isAdmin || user.isCaseWorkerHandling) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.travel": req.body,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.travel": req.body },
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
    if (user.isAdmin || user.isCaseWorkerHandling) {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.character": req.body,
          phaseSubmittedByClient: 4,
          phase: 4,
          phaseStatus: "approved",
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { "phase4.character": req.body, phaseSubmittedByClient: 4 },
        { new: true, useFindAndModify: false }
      );
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

    res
      .status(200)
      .json({
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
      { phaseStatus: "approved", isInitialRequestAccepted: true }
    );

    const email = isApplication.phase1.email;
    const html = `<b>Congratulations! Your application's initial phase has been approved. Please log in to the website to check your application status.</b> <br>`;

    const info = await sendEmail(
      email,
      "Congratulations! Phase Approved.",
      "",
      html
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
        redirect: "/phase2",
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

    if (
      isApplication.phase === 1 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
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

      res
        .status(200)
        .json({
          message: "Application(Phase 2) Approved Successfully.",
          success: true,
        });
    } else {
      return res
        .status(400)
        .json({
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

    if (
      isApplication.phase === 2 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        { phase: 3, phaseStaus: phaseStaus.Approved, "phase3.isPaid": true }
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
      height: 90vh;
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
        height: 71%;
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
        font-size: 18px;
        line-height: 24px;
        margin-top: 1rem;
        max-width: 80%;
      "
    >
      Dear ${user.name}, 
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
    font-size: 18px;
    line-height: 24px;
    margin-top: 1rem;
    max-width: 80%;
  "
>
 Best regards,
  Uk Immigration
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

[Immigration Department Name]
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

    if (
      isApplication.phase === 3 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
      await ApplicationModel.updateOne(
        { _id: applicationId },
        {
          phase: 4,
          phaseStaus: phaseStaus.Approved,
          applicationStatus: "approved",
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
      height: 90vh;
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
        height: 71%;
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
        font-size: 18px;
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
      font-size: 18px;
      line-height: 24px;
      margin-top: 1rem;
      max-width: 80%;
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

[Immigration Department Name]
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

const requestAPhase = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await ApplicationModel.findById(applicationId);
    const user = await UserModel.findById(application.userId);
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
        { $set: { ...req.body, requestedPhase: 2 } },
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
      height: 90vh;
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
        height: 71%;
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
        font-size: 18px;
        line-height: 24px;
        margin-top: 1rem;
        max-width: 80%;
      "
    >
      Dear ${user.name}, 
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
    font-size: 18px;
    line-height: 24px;
    margin-top: 1rem;
    max-width: 80%;
  "
>
 Best regards,
  Uk Immigration
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

[Immigration Department Name]
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
      await ApplicationModel.findByIdAndUpdate(
        applicationId,
        { $set: { ...req.body, requestedPhase: 3 } },
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
      height: 90vh;
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
        height: 71%;
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
        font-size: 18px;
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
      font-size: 18px;
      line-height: 24px;
      margin-top: 1rem;
      max-width: 80%;
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
    font-size: 18px;
    line-height: 24px;
    margin-top: 1rem;
    max-width: 80%;
  "
>
 Best regards,
  Uk Immigration
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

[Immigration Department Name]
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
        subject: "Approval of UK Immigration Phase 2",
        text: "",
        html: html,
      });

      if (info.messageId) {
        console.log("Email sent to the user", info.messageId);
      }
      return res
        .status(200)
        .json({ message: "Phase 3 Requested", success: true });
    } else {
      return res
        .status(400)
        .json({
          message: "To Request this phase, previous phase must be approved.",
          success: false,
        });
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
      return res
        .status(400)
        .json({
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

    res.status(200).json({ message: "Application Rejected", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Search Filter Application
const filterApplication = async (req, res) => {
  try {
    const queryConditions = [];
    const { filters } = req.body;

    console.log(filters.birthDate);

    if (filters.name) {
      queryConditions.push({
        "phase1.name": { $regex: new RegExp(filters.name, "i") },
      });
    }

    if (filters.caseId) {
      queryConditions.push({
        caseId: { $regex: new RegExp(filters.caseId, "i") },
      });
    }

    if (filters.country) {
      queryConditions.push({
        "phase1.country": { $regex: new RegExp(filters.country, "i") },
      });
    }

    if (filters.birthDate) {
      // Convert the string date to a JavaScript Date object
      const birthDate = new Date(filters.birthDate);

      // Create a range for birthDate filtering (e.g., matching on the exact date)
      const startDate = new Date(birthDate);
      const endDate = new Date(birthDate);
      endDate.setDate(endDate.getDate() + 1); // Add one day to include the whole day

      queryConditions.push({
        "phase1.birthDate": { $gte: startDate, $lt: endDate },
      });
    }

    console.log(queryConditions);

    const query =
      queryConditions.length === 1
        ? { $or: queryConditions }
        : queryConditions.length > 1
        ? { $and: queryConditions }
        : {};

    const result = await ApplicationModel.find(query).select({
      "phase1.name": true,
      "phase1.email": true,
      "phase1.contact": true,
      "phase1.birthDate": true,
      "phase1.country": true,
      caseId: true,
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
    const { name, content } = req.body;
    console.log(req.body);
    const notes = { name: name, content: content };
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
    const isApplication = await ApplicationModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
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

// Search Filter Invoices of Application
const filterInvoices = async (req, res) => {
  try {
    const queryConditions = [];
    const { filters } = req.body;
    console.log(req.body);
    if (filters.name) {
      queryConditions.push({
        "phase1.name": { $regex: new RegExp(filters.name, "i") },
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

    const query =
      queryConditions.length === 1
        ? { $or: queryConditions }
        : queryConditions.length > 1
        ? { $and: queryConditions }
        : {};
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
const linkCompany = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { companyId, name, email, fullNameCompanyContact } = req.body;

    if (
      !companyId ||
      !name ||
      !email ||
      !fullNameCompanyContact ||
      !applicationId
    ) {
      return res
        .status(400)
        .json({
          message: "Please fill out all required fields",
          success: false,
        });
    }

    const application = await ApplicationModel.findByIdAndUpdate(
      { _id: applicationId },
      { linkedCompany: { companyId, name, email, fullNameCompanyContact } },
      { new: true, useFindAndModify: false }
    );

    res.status(200).json({ application, success: true });
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

  postPhase1Manual,
  updatePhase1Manual,
};
