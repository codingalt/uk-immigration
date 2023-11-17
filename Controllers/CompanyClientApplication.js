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
        });

        const token = await user.generateAuthToken();
        const userData = await user.save();
        res.cookie("ukImmigrationJwtoken", token, {
          expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          httpOnly: true,
          sameSite: "none",
          secure: true,
        });

        const { _id, email, isCaseWorker, isEmailVerified, tokens, googleId } =
          userData;
        const userToken = tokens[tokens.length - 1];
        const result = {
          _id,
          email,
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

      if (referringAgent) {
        const isCaseWorker = await UserModel.findOne({
          email: referringAgent,
          isCaseWorker: true,
        });
        console.log(isCaseWorker);
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
        referringAgent,
        fcmToken,
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
        } = userData;
        const userToken = tokens[tokens.length - 1];
        const result = {
          _id,
          email,
          isCaseWorker,
          isEmailVerified,
          googleId,
          contact,
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
  signupCompanyClient,
};
