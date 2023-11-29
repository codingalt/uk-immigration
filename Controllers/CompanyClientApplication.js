const otpGenerator = require("otp-generator");
const ApplicationModel = require("../Models/ApplicationModel");
const UserModel = require("../Models/UserModel");
const { createChat } = require("./ChatController");
const CompanyClientModel = require("../Models/CompanyClientModel");
const { sendEmail } = require("../Utils/sendEmail");
const ChatModel = require("../Models/ChatModel");
const MessageModel = require("../Models/MessageModel");
const nodemailer = require("nodemailer");
const logo = `https://res.cloudinary.com/dncjtzg2i/image/upload/v1699259845/Ukimmigration-logo_dwq9tm.png`;
const bcrypt = require("bcryptjs");
const axios = require("axios");
const EmailTokenModel = require("../Models/EmailToken");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const PhaseNotificationModel = require("../Models/PhaseNotification");

const transporter = nodemailer.createTransport({
  host: process.env.HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

        

        const emails = [];
        if(req.body.phase1.companyContact){
          emails.push(req.body.phase1.companyContact)
        }

        if (req.body.phase1.clientContact) {
           const isAlreadyApp = await CompanyClientModel.findOne({
             "phase1.clientContact": req.body.phase1.clientContact,
           });
           if (isAlreadyApp) {
             return res
               .status(422)
               .json({
                 message: "Client Application with this Email already Exist.",
                 success: false,
               });
           }
          emails.push(req.body.phase1.clientContact);
        }
    // Generating CaseID
    const caseId = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    req.body.caseId = caseId;
    req.body.userId = caseId;

    const application = await new CompanyClientModel(req.body).save();
    let email;
    if(req.body.phase1){
      email = req.body.phase1.companyContact
    }else{
      email = req.body.phase1.clientContact;
    }

    const url = `${process.env.BASE_URL}/groupclient/signup/${application._id}`;
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
        Invitation to Complete Your Visa Application
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
      Hi, 
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
  We hope this message finds you well. We are pleased to inform you that your visa application process has been initiated by our administration team. In order to proceed further, we kindly invite you to complete the required application phases through our secure immigration portal.
Upon clicking the link, you will be directed to our portal where you can sign up and provide the necessary information in a phased manner. Please note that this process is designed to streamline the application process, making it convenient and efficient for you.
If you have any questions or encounter any issues during the application process, feel free to contact our dedicated support team at [Support Email or Phone Number].
We appreciate your prompt attention to this matter, as timely completion of the application will facilitate a smooth processing of your visa.
To access and submit your visa application, please click on the following button
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
        Signup
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
      to: emails,
      subject: "Invitation to Complete Your Visa Application",
      text: "",
      html: html,
    });

    if (info.messageId) {
      console.log("Email sent to the user", info.messageId);
    }

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

const signupCompanyClient = async (req, res) => {
  try {
    const {
      name,
      password,
      confirmPassword,
      contact,
      referringAgent,
      fcmToken,
      applicationId,
    } = req.body;
    console.log(req.body);

    if (req.body.isAdmin)
      return res
        .status(400)
        .json({ message: "Action Forbidden!", success: false });

    if (req.body.isCaseWorker)
      return res
        .status(400)
        .json({ message: "Action Forbidden!", success: false });

    if (req.body.googleAccessToken) {
      const googleAccessToken = req.body.googleAccessToken;
      // Signup with google OAuth
      try {
        const { data } = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${googleAccessToken}`,
            },
          }
        );
        console.log(data);

        const userExist = await UserModel.findOne({ email: data?.email });
        if (userExist) {
          return res
            .status(422)
            .json({ message: "Email already exist", success: false });
        }

        const user = new UserModel({
          name: data?.name,
          email: data?.email,
          isEmailVerified: data?.email_verified,
          profilePic: data?.picture,
          fcmToken,
          googleId: data?.sub,
          isGroupClient: true,
        });

        const token = await user.generateAuthToken();
        const userData = await user.save();
        res.cookie("ukImmigrationJwtoken", token, {
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          httpOnly: true,
          sameSite: "none",
          secure: true,
        });

        const { _id, email, name,contact, isCaseWorker, isEmailVerified, tokens, googleId } =
          userData;
        const userToken = tokens[tokens.length - 1];

        // Update User Id in Client Application 
        const updateUserId = await CompanyClientModel.updateOne(
          { _id: applicationId },
          { userId: userData?._id }
        );

        const result = {
          _id,
          email,
          name,
          contact,
          isCaseWorker,
          isEmailVerified,
          googleId,
          token: userToken.token,
        };
        return res.status(200).json({ user: result, success: true });
      } catch (err) {
        res
          .status(500)
          .json({ message: "Something went wrong", success: false });
      }
    } else {
      const { email } = req.body;
      // Normal Signup
      if (!name || !email || !password || !confirmPassword || !contact) {
        return res.status(422).json({
          message: "Please fill out all the fields properly",
          success: false,
        });
      }

      if (password != confirmPassword) {
        return res
          .status(422)
          .json({ message: "Password do not match", success: false });
      }

      const userExist = await UserModel.findOne({ email: email });
      if (userExist) {
        return res
          .status(422)
          .json({ message: "Email already exist", success: false });
      }

      let caseWorkerId;
      if (referringAgent) {
        const isCaseWorker = await UserModel.findOne({
          workerId: referringAgent,
          isCaseWorker: true,
        });
        console.log(isCaseWorker);
        caseWorkerId = isCaseWorker._id;
        if (!isCaseWorker)
          return res
            .status(400)
            .json({
              message: "Case worker not found with this email",
              success: false,
            });
      }

      const user = new UserModel({
        name,
        email,
        password,
        contact,
        referringAgent: caseWorkerId,
        fcmToken,
        isGroupClient: true,
      });
      const token = await user.generateAuthToken();
      const userData = await user.save();

      const otp = otpGenerator.generate(6, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      console.log(otp);

      //  Saving token to emailToken model
      const emailToken = await new EmailTokenModel({
        userId: user._id,
        email: user.email,
        otp: otp,
        token: crypto.randomBytes(32).toString("hex"),
      }).save();
      const url = `${process.env.BASE_URL}/group/${user._id}/verify/${emailToken.token}/${applicationId}`;
      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Email</title>
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
        height: 53%;
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
          color: #5D982E;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 0.5px;
          margin-top: 0.8rem;
        "
      >
        Verification Code ${otp}
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
        Thanks for creating a Uk Immigration account. Verify your email so you
        can get up and running quickly.
      </p>
      <a
        style="margin-top: 1.5rem; cursor: pointer"
        href="${url}"
        target="_blank"
        ><button
          style="
            width: 10.4rem;
            height: 2.8rem;
            border-radius: 8px;
            outline: none;
            border: none;
            color: #fff;
            background-color: #5D982E;
            font-weight: 600;
            font-size: 1.05rem;
            cursor: pointer;
          "
        >
          Verify Email
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
        Once your email is verified, we'll guide you to complete your account
        application. Visit our support site if you have questions or need help.
      </p>

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
        to: email,
        subject:
          "Verify your Email - Get started with your new Uk Immigration account",
        text: "",
        html: html,
      });
      console.log("Email Res", info);

      if (info.messageId) {
        console.log("Email sent successfully");
        res.cookie("ukImmigrationJwtoken", token, {
          expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          httpOnly: true,
          sameSite: "none",
          secure: true,
        });

        // Update User Id in Client Application 
        const updateUserId = await CompanyClientModel.updateOne(
          { _id: applicationId },
          { userId: userData?._id }
        );

        const {
          _id,
          email,
          isCaseWorker,
          isEmailVerified,
          tokens,
          contact,
          googleId,
          referringAgent,
        } = userData;
        const userToken = tokens[tokens.length - 1];
        const result = {
          _id,
          email,
          isCaseWorker,
          isEmailVerified,
          googleId,
          contact,
          referringAgent,
          token: userToken.token,
        };

        return res.status(200).json({
          user: result,
          message: "Please Check your Email to verify your account",
          success: true,
        });
      } else {
        await UserModel.findByIdAndDelete(user._id);
        await EmailTokenModel.deleteOne({ userId: user._id });
        return res
          .status(500)
          .json({ message: "Error Sending Email", success: false });
      }
    }
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

const getGroupClientApplicationsByUserId = async (req, res) => {
  try {
    const application = await CompanyClientModel.findOne({userId: req.userId.toString()});
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
      return res.status(400).json({
        message: "Please fill out all the fileds properly.",
        success: true,
      });

    const application = await CompanyClientModel.findById(applicationId);

    if (!application)
      return res.status(404).json({
        message: "Application not found with this id",
        success: false,
      });

    const user = await UserModel.findById(req.userId.toString());

    let isCaseWorkerHandling;
    let caseWorkerId;
    let caseWorkerName;
    // Assign case to case worker
    if (user.referringAgent) {
      // Find Case Worker
      const caseWorker = await UserModel.findById({
        _id: user.referringAgent,
      });

      if (caseWorker) {
        isCaseWorkerHandling = true;
        caseWorkerId = caseWorker?._id;
        caseWorkerName = caseWorker?.name;
      }
    }

   const updatedDocument = await CompanyClientModel.findByIdAndUpdate(
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
         isCaseWorkerHandling: isCaseWorkerHandling,
         caseWorkerId: caseWorkerId,
         caseWorkerName: caseWorkerName,
       },
     },
     { new: true, useFindAndModify: false }
   );

   console.log("Updated Document", updatedDocument);

    // Create Chat with this Application
    const chat = await createChat({
      userId: req.userId.toString(),
      applicationId: application._id,
    });

    if (!chat) {
      return res
        .status(400)
        .json({ message: "Error creating chat", success: false });
    }

    return res.status(200).json({ result: updatedDocument, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const postCompanyClientPhase2 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
         const applicationId =
           req.params.applicationId || req.body.applicationId;

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
    res.status(200).json({ application: result, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};

const postCompanyClientPhase3 = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const applicationId = req.params.applicationId || req.body.applicationId;
    const files = req.files;
    console.log(files);
    const chalanFile = `/Uploads/${files?.chalan[0]?.filename}`;
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
            "phase3.dateTime": new Date(),
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

const postGroupGeneral = async (req, res) => {
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
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.general": req.body,
          "phase4.isCompleted": 1,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await CompanyClientModel.findByIdAndUpdate(
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

const postGroupAccomodation = async (req, res) => {
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
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.accommodation": req.body,
          "phase4.isCompleted": 2,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await CompanyClientModel.findByIdAndUpdate(
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

const postGroupFamily = async (req, res) => {
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
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.family": req.body,
          "phase4.isCompleted": 3,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await CompanyClientModel.findByIdAndUpdate(
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

const postGroupLanguage = async (req, res) => {
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
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.languageProficiency": req.body,
          "phase4.isCompleted": 4,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await CompanyClientModel.findByIdAndUpdate(
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

const postGroupEducation = async (req, res) => {
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
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.education": req.body,
          "phase4.isCompleted": 5,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await CompanyClientModel.findByIdAndUpdate(
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

const postGroupEmployment = async (req, res) => {
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
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.employment": req.body,
          "phase4.isCompleted": 6,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await CompanyClientModel.findByIdAndUpdate(
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

const postGroupMaintenance = async (req, res) => {
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
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.maintenance": req.body,
          "phase4.isCompleted": 7,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await CompanyClientModel.findByIdAndUpdate(
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

const postGroupTravel = async (req, res) => {
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
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.travel": req.body,
          "phase4.isCompleted": 8,
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    } else {
      const application = await CompanyClientModel.findByIdAndUpdate(
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

const postGroupCharacter = async (req, res) => {
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
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.character": req.body,
          "phase4.isCompleted": 9,
          phaseSubmittedByClient: 4,
          phase: 4,
          phaseStatus: "approved",
        },
        { new: true, useFindAndModify: false }
      );
      return res.status(200).json({ application, success: true });
    } else {
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        {
          "phase4.character": req.body,
          phaseSubmittedByClient: 4,
          "phase4.isCompleted": 9,
        },
        { new: true, useFindAndModify: false }
      );
      return res.status(200).json({ application, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const requestCompanyClientPhase = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await CompanyClientModel.findById(applicationId);
    const user = await UserModel.findById(application.userId);
    if(Object.keys(req.body).length === 0 && req.body.constructor === Object) return res.status(400).json({message: "Please fill out all the required fields", success: false});

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
      await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        { $set: { ...req.body, requestedPhase: 2 } },
        { new: true, useFindAndModify: false }
      );

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

      await CompanyClientModel.findByIdAndUpdate(
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

    if (
      isApplication.phase >= 1 &&
      isApplication.phaseStatus === phaseStaus.Approved
    ) {
      return res
        .status(400)
        .json({ message: "This Phase is Already Approved", success: false });
    }

    await CompanyClientModel.updateOne(
      { _id: applicationId },
      {
        phaseStatus: "approved",
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
      await CompanyClientModel.updateOne(
        { _id: applicationId },
        {
          phase: 2,
          phaseStaus: phaseStaus.Approved,
          $push: {
            report: { phase: 2, status: "approved", dateTime: new Date() },
          },
        }
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

const approveCompanyPhase3 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await CompanyClientModel.findById(applicationId);
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
      await CompanyClientModel.updateOne(
        { _id: applicationId },
        {
          phase: 3,
          phaseStaus: phaseStaus.Approved,
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
        Approval of UK Immigration Phase 3
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

const approveCompanyPhase4 = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const isApplication = await CompanyClientModel.findById(applicationId);
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
      await CompanyClientModel.updateOne(
        { _id: applicationId },
        {
          phase: 4,
          phaseStaus: phaseStaus.Approved,
          applicationStatus: "approved",
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
        Approval of UK Immigration Phase 4
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

// Assign Application to CaseWorker By Admin
const assignGroupApplicationToCaseWorker = async (req, res) => {
  try {
    const { applicationId, caseWorkerId, caseWorkerName } = req.body;
    const caseWorker = await UserModel.findById(caseWorkerId);
    const isApplication = await CompanyClientModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id.",
        success: false,
      });
    }
    await CompanyClientModel.updateOne(
      { _id: applicationId },
      {
        $set: {
          isCaseWorkerHandling: true,
          caseWorkerId: caseWorkerId,
          caseWorkerName: caseWorkerName,
        },
      }
    );

    // Add CaseWorker Id to notifications 
     await PhaseNotificationModel.updateMany(
       { applicationId: applicationId },
       {
         $set: {
           caseWorkerId: caseWorkerId,
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
            Approval of UK Immigration Phase 3
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
          Dear ${caseWorkerName},
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
            to: caseWorker?.email,
            subject: "New Case Assignment: Action Required",
            text: "",
            html: html,
          });

          if (info.messageId) {
            console.log("Email sent to the user", info.messageId);
          }

    res.status(200).json({ message: "CaseWorker Assigned", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Add Note to Application By Admin
const addNotesGroupClient = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { name, content } = req.body;
    console.log(req.body);
    const notes = { name: name, content: content };
    const isApplication = await CompanyClientModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id",
        success: false,
      });
    }
    await CompanyClientModel.findByIdAndUpdate(
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

const getAllGroupApplicationData = async (req, res) => {
  try {
    const applications = await CompanyClientModel.find({});

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

const updateGroupApplicationService = async (req, res) => {
  try {
    const { phaseStatus, phase, applicationStatus } = req.body;
    const { applicationId } = req.params;
    if (phaseStatus || phase || applicationStatus) {
      return res.status(400).json({
        message: "Action Forbidden! You don't have access to change.",
      });
    }

    const application = await CompanyClientModel.findByIdAndUpdate(
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

const rejectGroupApplication = async (req, res) => {
  try {
    const { applicationId, rejectPhaseReason } = req.body;
    const isApplication = await CompanyClientModel.findById(applicationId);
    if (!isApplication) {
      return res.status(400).json({
        message: "Application not found with this id.",
        success: false,
      });
    }
    await CompanyClientModel.updateOne(
      { _id: applicationId },
      {
        $set: {
          applicationStatus: "rejected",
          phaseStatus: "rejected",
          rejectPhaseReason: rejectPhaseReason,
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

// Link Company With Client Application
const linkGroupCompany = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { companyId, name } = req.body;

    if (
      !companyId ||
      !name ||
      !applicationId
    ) {
      return res
        .status(400)
        .json({
          message: "Please fill out all required fields",
          success: false,
        });
    }

    const application = await CompanyClientModel.findByIdAndUpdate(
      { _id: applicationId },
      { linkedCompany: { companyId, name } },
      { new: true, useFindAndModify: false }
    );

    res.status(200).json({ application, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Update Application Phases Data By Admin

const updateGroupPhaseByAdmin = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { phase, data } = req.body;
    const user = await UserModel.findById(req.userId.toString());
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", success: false });

    if (phase === 1) {
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        { $set: { phase1: data } },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }

    if (phase === 2) {
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        { $set: { phase2: data } },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }

    if (phase === 3) {
      const application = await CompanyClientModel.findByIdAndUpdate(
        applicationId,
        { $set: { phase3: data } },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({ application, success: true });
    }

    if (phase === 4) {
      const application = await CompanyClientModel.findByIdAndUpdate(
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
  signupCompanyClient,
  getGroupClientApplicationsByUserId,
  assignGroupApplicationToCaseWorker,
  addNotesGroupClient,
  getAllGroupApplicationData,
  updateGroupApplicationService,
  rejectGroupApplication,
  linkGroupCompany,
  updateGroupPhaseByAdmin,
  postGroupGeneral,
  postGroupAccomodation,
  postGroupFamily,
  postGroupLanguage,
  postGroupEducation,
  postGroupEmployment,
  postGroupMaintenance,
  postGroupTravel,
  postGroupCharacter,
};
