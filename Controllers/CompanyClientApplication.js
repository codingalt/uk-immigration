const otpGenerator = require("otp-generator");
const ApplicationModel = require("../Models/ApplicationModel");
const UserModel = require("../Models/UserModel");
const { createChat } = require("./ChatController");
const CompanyClientModel = require("../Models/CompanyClientModel");
const { sendEmail } = require("../Utils/sendEmail");
const ChatModel = require("../Models/ChatModel");
const MessageModel = require("../Models/MessageModel");
const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   type: "SMTP",
//   secure: true,
//   logger: true,
//   debug: true,
//   secureConnection: true,
//   auth: {
//     user: "faheemmalik640@gmail.com",
//     pass: "paho tctl xadt lnjo",
//   },
//   tls: {
//     rejectUnAuthorized: false,
//   },
// });

const phaseStaus = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
};

const sendRequestToCompanyClient = async (req, res) => {
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

    req.body.caseId = caseId;

    const application = await new CompanyClientModel(req.body).save();
    let email;
    if(req.body.phase1){
      email = req.body.phase1.companyContact
    }else{
      email = req.body.phase1.clientContact;
    }

    const url = `http://localhost:3000/company/signup/app_id?=${application._id}`
    const html = `<b style="color: green;font-size: 1rem; font-weight: 600;text-align: center;">New Group Client Application Request </b> <br> <a href=${url} target="_blank"> <button>Continue</button> </a>`;

    const info = await sendEmail(
      email,
      "Application Request",
      url,
      html
    );

    const { phase1, companyId, isInitialRequestAccepted, _id } = application;
    const result = {
      phase1,
      companyId,
      applicationStatus: application.applicationStatus,
      phase: application.phase,
      phaseStatus: application.phaseStatus,
      isInitialRequestAccepted,
      _id
    };
    res.status(200).json({ result, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};

const getApplicationsByCompanyId = async(req,res)=>{
  try {
    const {companyId} = req.params;
    const applications = await CompanyClientModel.find({
      companyId: companyId,
    }).select({
      _id: true,
      caseId: true,
      "phase1.fullNameAsPassport": true,
      "phase1.clientContact": true,
      "phase1.companyContact": true,
      "phase1.birthDate": true,
      "phase1.applicationType": true,
      "phase1.nationality": true,
    });
    return res.status(200).json({ applications,success: true });
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
}

const getGroupClientApplicationsById = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await CompanyClientModel.findById(applicationId);
    return res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postCompanyClientPhase1 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const {
      fullNameAsPassport,
      postalAddress,
      birthDate,
      nationality,
      passportNumber,
      phaseStatus,
      phase,
      applicationStatus,
    } = req.body;

    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }

    if (
      !fullNameAsPassport ||
      !postalAddress ||
      !birthDate ||
      !nationality ||
      !passportNumber
    )
      return res
        .status(400)
        .json({
          message: "Please fill out all the fileds properly.",
          success: true,
        });

    const application = await CompanyClientModel.findById(applicationId);

    if (!application)
      return res
        .status(404)
        .json({
          message: "Application not found with this id",
          success: false,
        });

    await CompanyClientModel.findByIdAndUpdate(
      applicationId,
      {
        $set: {
          "phase1.fullNameAsPassport": fullNameAsPassport,
          "phase1.postalAddress": postalAddress,
          "phase1.birthDate": birthDate,
          "phase1.nationality": nationality,
          "phase1.passportNumber": passportNumber,
          phaseSubmittedByClient: 1,
          phase: 1,
          userId: req.userId.toString(),
        },
      },
      { new: true, useFindAndModify: false }
    );

    // Create Chat with this Application
    const chat = await createChat({
      userId: req.userId.toString(),
      applicationId: application._id,
    });

    if(!chat){
      return res.status(400).json({message: "Error creating chat", success: false});
    }

    return res
      .status(200)
      .json({ message: "Phase 1 Data Submitted", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postCompanyClientPhase2 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    const files = req.files;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }

    const application = await CompanyClientModel.findById(applicationId);

    if (!application)
      return res.status(404).json({
        message: "Application not found with this id",
        success: false,
      });

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

    // Check if admin has requested client for phase
    const isRequested = await CompanyClientModel.findById(applicationId);
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

    // Properties to exclude from validation
    const excludedProperties = [
      "otherDocumentNotes",
      "isTerms",
      "isAuthority",
      "isAllowAccessToFile",
      "isShareClientDetails",
    ];

    // Filter out excluded properties from filteredDataKeys
    const filteredDataKeys = Object.keys(filteredData).filter(
      (key) => !excludedProperties.includes(key)
    );

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

    const { isTerms, isAuthority, isAllowAccessToFile, isShareClientDetails } =
      isRequested.phase2;

      const finalValues = {...filesObj, isTerms, isAuthority, isAllowAccessToFile, isShareClientDetails}

    // Update Phase 2
    const result = await CompanyClientModel.findByIdAndUpdate(
      applicationId,
      { $set: { phase2: finalValues, phaseSubmittedByClient: 2 } },
      { new: true, useFindAndModify: false }
    );
    res.status(200).json({ result: result?.phase2, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};

const postCompanyClientPhase3 = async (req, res) => {
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
    const isRequested = await CompanyClientModel.findById(applicationId);

    if (!user.isAdmin) {
      if (isRequested.requestedPhase < 3) {
        return res
          .status(400)
          .json({
            message:
              "You can't submit phase 3 data right now, Untill admin requests you to submit phase 3 data.",
          });
      }
    }

      // Update Phase 3
      const application = await CompanyClientModel.findByIdAndUpdate(
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
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postCompanyClientPhase4 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const {
      general,
      accommodation,
      family,
      languageProficiency,
      education,
      employment,
      maintenance,
      travel,
      character,
    } = req.body.phase4;
    const general1 = general;
    const accommodation1 = accommodation;
    const family1 = family;
    const languageProficiency1 = languageProficiency;
    const education1 = education;
    const employment1 = employment;
    const maintenance1 = maintenance;
    const travel1 = travel;
    const character1 = character;
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

    // if (
    //   !general1 ||
    //   !accommodation1 ||
    //   !family1 ||
    //   !languageProficiency1 ||
    //   !education1 ||
    //   !employment1 ||
    //   !maintenance1 ||
    //   !travel1 ||
    //   !character1
    // ) {
    //   return res
    //     .status(400)
    //     .json({
    //       message: "Please Provide all the information Properly.",
    //       success: false,
    //     });
    // }

      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        { ...req.body, phaseSubmittedByClient: 4 },
        { new: true, useFindAndModify: false }
      );

      res.status(200).json({ application, success: true });
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const requestCompanyClientPhase = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await CompanyClientModel.findById(applicationId);

    if(Object.keys(req.body).length === 0 && req.body.constructor === Object) return res.status(400).json({message: "Please fill out all the required fields", success: false});

    if (
      application.phase === 1 &&
      application.phaseStatus === phaseStaus.Approved
    ) {
      await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        { $set: { ...req.body, requestedPhase: 2 } },
        { new: true, useFindAndModify: false }
      );
      return res
        .status(200)
        .json({ message: "Phase 2 Requested", success: true });
    } else if (
      application.phase === 2 &&
      application.phaseStatus === phaseStaus.Approved
    ) {
      await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        { $set: { ...req.body, requestedPhase: 3 } },
        { new: true, useFindAndModify: false }
      );
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

const acceptCompanyInitialRequest = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await CompanyClientModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }
    await CompanyClientModel.findByIdAndUpdate(
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

const approveCompanyPhase1 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await CompanyClientModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }

    await CompanyClientModel.updateOne(
      { _id: applicationId },
      { phaseStatus: "approved", isInitialRequestAccepted: true }
    );
    
    const user = await UserModel.findById(isApplication.userId);
    const email = user?.email;
    const html = `<b>Congratulations! Your application's initial phase has been approved. Please log in to the website to check your application status.</b> <br>`;
    // const info = await transporter.sendMail({
    //   from: "faheemmalik640@gmail.com",
    //   to: email,
    //   subject: "Congratulations! Phase 1 Approved.",
    //   text: "text",
    //   html: html,
    // });
    // const info = await sendEmail(
    //   email,
    //   "Congratulations! Phase 1 Approved.",
    //   "",
    //   html
    // );
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
      .json({
        message: "Application(Phase 1) Approved Successfully.",
        success: true,
      });

  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const approveCompanyPhase2 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await CompanyClientModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }

    if (
      isApplication.phase === 1 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
      await CompanyClientModel.updateOne(
        { _id: applicationId },
        { phase: 2, phaseStaus: phaseStaus.Approved }
      );

      const user = await UserModel.findById(isApplication.userId);
      const email = user?.email;
      const html = `<b>Congratulations! Your application's Phase 2 has been approved. Please log in to the website to check your application status.</b> <br>`;

      const info = await sendEmail(
        email,
        "Congratulations! Phase 2 Approved.",
        "",
        html
      );

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

const approveCompanyPhase3 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await CompanyClientModel.findById(applicationId);
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
      await CompanyClientModel.updateOne(
        { _id: applicationId },
        { phase: 3, phaseStaus: phaseStaus.Approved }
      );

      const user = await UserModel.findById(isApplication.userId);
      const email = user?.email;
      const html = `<b style="color: green;font-size: 1rem; font-weight: 600;text-align: center;">Congratulations! Your application's Phase 3 has been approved. Please log in to the website to check your <br> application status.</b> <br> <a href="http://localhost:3000" target="_blank"> <button>Login Here</button> </a>`;

      const info = await sendEmail(
        email,
        "Congratulations! Phase 3 Approved.",
        "",
        html
      );

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
          isPhaseMessage: true,
        });
        await newMessage.save();

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

const approveCompanyPhase4 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await CompanyClientModel.findById(applicationId);
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
      await CompanyClientModel.updateOne(
        { _id: applicationId },
        {
          phase: 4,
          phaseStaus: phaseStaus.Approved,
          applicationStatus: "approved",
        }
      );

      const user = await UserModel.findById(isApplication.userId);
      const email = user?.email;
      const html = `<b>Congratulations! Your application's Phase 4 has been approved. Please log in to the website to check your application status.</b> <br>`;

      const info = await sendEmail(
        email,
        "Congratulations! Phase 4 Approved.",
        "",
        html
      );

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
          isPhaseMessage: true,
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


module.exports = {
  sendRequestToCompanyClient,
  postCompanyClientPhase1,
  postCompanyClientPhase2,
  postCompanyClientPhase3,
  postCompanyClientPhase4,
  requestCompanyClientPhase,
  acceptCompanyInitialRequest,
  approveCompanyPhase1,
  approveCompanyPhase2,
  approveCompanyPhase3,
  approveCompanyPhase4,
  getApplicationsByCompanyId,
  getGroupClientApplicationsById,
};
