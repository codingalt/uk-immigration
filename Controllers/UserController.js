const EmailTokenModel = require("../Models/EmailToken");
const UserModel = require("../Models/UserModel");
const OtpModel = require("../Models/OtpModel");
const crypto = require("crypto");
const { sendOtp } = require("../Utils/sendOtp");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../Utils/sendEmail");
var postmark = require("postmark");
const ApplicationModel = require("../Models/ApplicationModel");
var client = new postmark.Client("<server key>");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const otpGenerator = require("otp-generator");

const transporter = nodemailer.createTransport({
  host: process.env.HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const signupUser = async (req, res) => {
  try {
    const { name, password, confirmPassword, contact, referringAgent,fcmToken} =
      req.body;
      console.log(req.body);

      if(req.body.isAdmin) return res.status(400).json({message: "Action Forbidden!", success: false});

      if(req.body.isCaseWorker) return res.status(400).json({message: "Action Forbidden!", success: false});
      
      if (req.body.googleAccessToken){
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
            googleId: data?.sub
          });

          const token = await user.generateAuthToken();
         const userData = await user.save();
          res.cookie("ukImmigrationJwtoken", token, {
            expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            sameSite: "none",
            secure: true,
          });

          const {
            _id,
            email,
            isCaseWorker,
            isEmailVerified,
            tokens,
            googleId,
          } = userData;
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

      }else{
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

        //  Saving token to emailToken model
        const emailToken = await new EmailTokenModel({
          userId: user._id,
          otp: otp,
          token: crypto.randomBytes(32).toString("hex"),
        }).save();
        const url = `${process.env.BASE_URL}/${user._id}/verify/${emailToken.token}`;
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Email</title>
</head>
<body style="width: 100%;height: 90vh;background-color: #F6F9FC;display: flex;justify-content: center;align-items: center; font-family: sans-serif;">

    <div class="card" style="width: 60%;height: 50%;background-color: #fff;border-radius: 10px;padding: 30px;margin-top: 2rem;padding-left: 40px;margin: 2rem auto;">
        <h3 style="color: #6772e5;font-weight: 800;font-size: 1.1rem;letter-spacing: .5px;">UK Immigration</h3>
        <h3 style="color: #6772e5;font-weight: 800;font-size: 1.1rem;letter-spacing: .5px;margin-top: .8rem;">Verification Code ${otp}</h3>
        <p style="color: #414552!important;font-weight: 400;font-size: 18px;line-height: 24px;margin-top: 1rem;max-width: 80%;">	Thanks for creating a Uk Immigration account. Verify your email so you can get up and running quickly.</p>
        <a style="margin-top: 1.5rem;cursor: pointer;" href=${url} target="_blank"><button style="width: 10.4rem;height: 2.8rem;border-radius: 8px;outline: none;border: none;color: #fff;background-color: #625AFA;font-weight: 600;font-size: 1.05rem;cursor: pointer;">Verify Email</button></a>

        <p style="color: #414552!important;font-weight: 400;font-size: 16px;line-height: 24px;max-width: 88%;margin-top: 6rem;">	Once your email is verified, we’ll guide you to complete your account application. Visit our support site if you have questions or need help.</p>
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
        //  await sendEmail(user.email, "Verify your Email - Get started with your new Uk Immigration account", "",html);

        if (info.messageId){
          console.log("Email sent successfully");
          res.cookie("ukImmigrationJwtoken", token, {
            expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            sameSite: "none",
            secure: true,
          });

           const {
             _id,
             email: emailUser,
             isCaseWorker,
             isEmailVerified,
             tokens,
             googleId,
           } = userData;
           const userToken = tokens[tokens.length - 1];
           const result = {
             _id,
             emailUser,
             isCaseWorker,
             isEmailVerified,
             googleId,
             token: userToken.token,
           };

           res.status(200).json({
             user: result,
             message: "Please Check your Email to verify your account",
             success: true,
           });

        } else{
          await UserModel.findByIdAndDelete(user._id);
          await EmailTokenModel.deleteOne({userId: user._id})
          return res.status(500).json({message:"Error Sending Email", success: false})
        }

       
      }


  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};

const sendmail = async(req,res)=>{
  try {

    const email = "faheemmalik886@gmail.com";
    console.log(email);

    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const url = `${process.env.BASE_URL}/1122/verify/2233`;
    const html = `<b>Click on the link below to verify your email.</b> <br> ${url}`;
    console.log(transporter);
    transporter.verify(function (error, success) {
      if (error) {
           console.log(error);
           return res.status(500).json({
              message: error,
              success: true,
            });

      } else {
        console.log("Server is ready to take our messages");
         return res.status(200).json({
           message: "Server is ready to take our messages",
           success: true,
         });
      }
    });
    const info = await transporter.sendMail({
      from: {
        address: "testmailingsmtp@lesoft.io",
        name: "Lesoft Test Email",
      },
      to: email,
      subject: "Email Verification",
      text: "Verify Your email address",
      html: html,
    });

    console.log(info);
    return res.json(info);
    
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message)
  }
}

const verifyEmail = async(req,res)=>{
    try {

        const {id,token} = req.params;
        const {otp} = req.params;
        console.log(id);
        console.log("token",token);
        const user = await UserModel.findOne({_id: id});
        const verifyToken = await EmailTokenModel.findOne({userId: id, token});
        if(!verifyToken){
            return res.status(400).json({message: "Invalid Link",success:false});
        }

        await UserModel.updateOne({ _id: user._id}, {isEmailVerified : true});
        await EmailTokenModel.deleteOne({ _id: verifyToken._id });
        res.status(200).json({message: "Email verified", success:true});
        
    } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    }
}

const updateMobileVerify = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await UserModel.updateOne({ _id: userId, isMobileVerified: true });
    console.log(user);
    res.status(200).json({ message: "Contact Number verified", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Update User Data 
const updateUserData = async (req, res) => {
  try {
    const userId  = req.userId.toString();
    console.log(req.body);
    const { name, email, contact } = req.body;
    const files = req.files;
    console.log(files);
    if(files?.profilePic){
      var file = req.files?.profilePic[0]?.filename;
      var profilePic = `/Uploads/${file}`;
      await UserModel.findByIdAndUpdate(
      {_id: userId},
      {$set: {name: name, email: email, contact: contact, profilePic: profilePic}},
      {new: true, useFindAndModify: false});
    }else{

      await UserModel.findByIdAndUpdate(
      {_id: userId},
      {$set: {name: name, email: email, contact: contact}},
      {new: true, useFindAndModify: false});

    }
    
     
    res.status(200).json({ message: "User Data Updated", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    console.log(err);
  }
};

// Change Password 
const changePassword = async (req, res) => {
  try {
    const userId = req.userId.toString();
    const {password, confirmPassword, currentPassword} = req.body;
    if(!password || !confirmPassword) return res.status(400).json({message: "Please fill out all the fields properly.", success: false});

    if(password != confirmPassword) return res.status(400).json({message: "New Password do not match.", success: false});

    const user = await UserModel.findById(userId).select({
      password: true,
      email: true,
      isEmailVerified: true,
    });

    console.log(user);

    // If password does not exist | User signed up with google account | Add New Password with google
    if(!user.password){
      // Otherwise Change Password
      const hashedPassword = await bcrypt.hash(password, 12);
      await UserModel.updateOne({ _id: userId }, { password: hashedPassword });
      return res
        .status(200)
        .json({ message: "Password Updated Successfully.", success: true });
    }
      

    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    
    if(!isPasswordMatch) return res.status(400).json({message: "Your Last password is wrong.", success: false});
    
    // Otherwise Change Password 
    const hashedPassword = await bcrypt.hash(password, 12);
    await UserModel.updateOne({ _id: userId }, { password: hashedPassword });
    res.status(200).json({ message: "Password Updated Successfully.", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Forgot Password 
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

      if (!email) return res.status(422).json({message: "Email is Required.",success: false,});

      const userExist = await UserModel.findOne({ email: email });
      if (!userExist) return res.status(422).json({ message: "Email does not exist.", success: false });

      //  Saving token to emailToken model
      const emailToken = await new EmailTokenModel({
        userId: userExist._id,
        token: crypto.randomBytes(32).toString("hex"),
      }).save();
      const url = `${process.env.BASE_URL}/reset-password/${userExist._id}/${emailToken.token}`;
      const result = await sendEmail(email, "Reset Password", url);

      console.log(result);
        return res.status(200).json({message: "An Email has been sent to your email to Recover your password.", success: true})
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Reset Password 
const verifyResetPasswordLink = async (req, res) => {
  try {
    const { id, token } = req.params;
    const user = await UserModel.findOne({ _id: id });
    const verifyToken = await EmailTokenModel.findOne({ userId: id, token });
    if (!verifyToken) {
      return res.status(400).json({ message: "Invalid Link", success: false });
    }
      
    res.status(200).json({ message: "Email Verified. You can now create a new password.", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Reset Password 
const createNewPassword = async (req, res) => {
  try {
    const userId  = req.userId.toString();
    const { password, confirmPassword, token } = req.body;
    const user = await UserModel.findOne({ _id: userId}); 
    const isEmailToken = await EmailTokenModel.findOne({ userId: userId, token: token }); 

    if(!isEmailToken) return res.status(400).json({ message: "Token Expired", success: false });

    if(!user) return res.status(400).json({ message: "User not found", success: false });
      
     if (password != confirmPassword) {
       return res
         .status(422)
         .json({ message: "Password do not match", success: false });
     }
     const hashedPassword = await bcrypt.hash(password, 12);
     await UserModel.findByIdAndUpdate(userId, {$set: {password: hashedPassword}}, {new: true,useFindAndModify: false})

    await EmailTokenModel.deleteOne({ _id: isEmailToken._id });
    
    res.status(200).json({ message: "Password Changed Successfully.", success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Verify Otp 
  const verifyOtp = async (req,res) =>{
    const {contact,otp} = req.body;
    // First check if email is verified 
    const user = await UserModel.findOne({contact});
    if(!user.isEmailVerified) return res.status(400).json({message:"Please Verify your email first", success: false});
    const otpHolder = await OtpModel.find({contact});
    if(otpHolder.length === 0){
      return res.status(400).json({message: 'You have used an Expired OTP!',success: false});
    }
    
    const rightOtpFind = otpHolder[otpHolder.length - 1];
    const validUser = await bcrypt.compare(req.body.otp, rightOtpFind.otp);

    if(rightOtpFind.contact === contact && validUser){
        const otpDelete = await OtpModel.deleteMany({
          contact: rightOtpFind.contact,
        });
           return res
             .status(200)
             .json({ message: "OTP Authenticated Successfully", success: true });
        
    }else{
      return res.status(400).json({message: 'Your OTP was wrong',success: false});
    }
  }

  //Login Route
const loginUser = async (req, res) => {
  try {
    const {googleAccessToken} = req.body;
    if(googleAccessToken){
      // Login With Google OAuth 
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
        const signin = await UserModel.findOne({ email: data?.email });

        if (!signin) {
          return res
            .status(404)
            .json({ message: "User does not exist", success: false });
        }

        if (!signin.googleId) {
          return res
            .status(404)
            .json({ message: "Invalid Login Details.", success: false });
        }

        //Generating JSON web token
       const token = await signin.generateAuthToken();
        res.cookie("ukImmigrationJwtoken", token, {
          expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          httpOnly: true,
          sameSite: "none",
          secure: true,
        });

        const { _id, email, isCaseWorker, isEmailVerified, tokens,googleId } = signin;
        const userToken = tokens[tokens.length - 1];
        const result = {
          _id,
          email,
          isCaseWorker,
          isEmailVerified,
          googleId,
          token: userToken.token,
        };

        return res.status(200).json({user: result, success: true});
      } catch (err) {
        res.status(500).json({message: "Something went wrong", success: false});
      }

    }else{
      // Normal Login 
      let token;
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({
            message: "Email or Password cannot be empty",
            success: false,
          });
      }
      const signin = await UserModel.findOne({ email: email }).select({
        password: true,
        email: true,
        isEmailVerified: true,
        isAdmin: true,
        isCaseWorker: true,
        tokens: true
      });

      if (!signin) {
        return res
          .status(404)
          .json({ message: "Invalid login details", success: false });
      }

      if (!signin.password) {
        return res
          .status(404)
          .json({ message: "Invalid login details", success: false });
      }
      
      if (signin) {
        const isMatch = await bcrypt.compare(password, signin.password);
        if (isMatch) {

          const { _id, email, isCaseWorker, isEmailVerified, tokens} = signin;
          const userToken = tokens[tokens.length - 1];
          const result = {_id, email, isCaseWorker, isEmailVerified, token: userToken.token}

          // Check If he is Admin
          if (signin.isAdmin) {
            //Generating JSON web token
            token = await signin.generateAuthToken();
            res.cookie("ukImmigrationJwtoken", token, {
              expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              httpOnly: true,
              secure: true,
              sameSite: "none",
            });
             return res.status(200).json({success: true, user: result, redirect: "/admin/home"});
          }

          // Check if he is case worker
          if (signin.isCaseWorker) {
            //Generating JSON web token
            token = await signin.generateAuthToken();
            res.cookie("ukImmigrationJwtoken", token, {
              expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              httpOnly: true,
              sameSite: "none",
              secure: true,
            });
            return res.status(200).json({success: true, user: result, redirect: "/admin/home"});

          }

          // Else Login as a normal user 
          if (!signin.isEmailVerified) {
            //  Saving token to emailToken model
            const emailToken = await new EmailTokenModel({
              userId: signin._id,
              token: crypto.randomBytes(32).toString("hex"),
            }).save();
            const url = `${process.env.BASE_URL}/${signin._id}/verify/${emailToken.token}`;
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Email</title>
</head>
<body style="width: 100%;height: 90vh;background-color: #F6F9FC;display: flex;justify-content: center;align-items: center; font-family: sans-serif;">

    <div class="card" style="width: 60%;height: 50%;background-color: #fff;border-radius: 10px;padding: 30px;margin-top: 2rem;padding-left: 40px;margin: 2rem auto;">
        <h3 style="color: #6772e5;font-weight: 800;font-size: 1.1rem;letter-spacing: .5px;">UK Immigration</h3>
        <p style="color: #414552!important;font-weight: 400;font-size: 18px;line-height: 24px;margin-top: 2rem;max-width: 80%;">	Thanks for creating a Uk Immigration account. Verify your email so you can get up and running quickly.</p>
        <a style="margin-top: 1.5rem;cursor: pointer;" href=${url} target="_blank"><button style="width: 10.4rem;height: 2.8rem;border-radius: 8px;outline: none;border: none;color: #fff;background-color: #625AFA;font-weight: 600;font-size: 1.05rem;cursor: pointer;">Verify Email</button></a>

        <p style="color: #414552!important;font-weight: 400;font-size: 16px;line-height: 24px;max-width: 88%;margin-top: 6rem;">	Once your email is verified, we’ll guide you to complete your account application. Visit our support site if you have questions or need help.</p>
    </div>

    
</body>
</html>`;
            await sendEmail(
              signin.email,
              "Verify your Email - Get started with your new Uk Immigration account",
              "",
              html
            );
            
            return res.status(400).json({
              message:
                "To continue login, Please verify your email. A Verification link has been sent to your email.",
              success: false,
            });
          }
          //Generating JSON web token
          token = await signin.generateAuthToken();
          res.cookie("ukImmigrationJwtoken", token, {
            expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            sameSite: "none",
            secure: true,
          });
          
          return res.status(200).json({
            message: "Login Successfully",
            success: true,
            user: result,
            redirect: "/client/home",
          });
        } else {
          res
            .status(400)
            .json({ message: "Invalid login details", success: false });
        }
      }

    }
    
    
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Something went wrong Please try again",
        success: false,
      });
      console.log(error);
  }
};

// Get all users 
const getAllUsers = async (req, res) => {
  try {
    const user = await UserModel.find({});
    res.status(200).json({ user, success: true });
  } catch (err) {
    res.status(500).json({message: err.message, success: false});
  }
};

// Logout User
const logoutUser = async (req, res) => {
  try {
    res.clearCookie("ukImmigrationJwtoken");
    res.cookie("ukImmigrationJwtoken", "", {
      expires: new Date(0),
      httpOnly: true,
      sameSite: "none",
      secure: true
    });
    res.status(200).json({ message:"Logout Successfully", success: true });
  } catch (err) {
       res.status(500).json({ message: err.message, success: false });
  }
};

const AuthRoute = async (req, res) => {
  try {
    let token;
    const bearerToken = req.headers["authorization"];
    if (req.cookies.ukImmigrationJwtoken) {
      token = req.cookies.ukImmigrationJwtoken;
    } else if (typeof bearerToken !== "undefined") {
      const bearer = bearerToken.split(" ");
      token = bearer[1];
    } else {
      return res.status(401).json({
        message: "Unotherized User: Please login first",
        success: false,
      });
    }

      const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
      const rootUser = await UserModel.findOne({
        _id: verifyToken._id,
        "tokens.token": token,
      });
      if (!rootUser) {
        throw new Error("User not found..");
      } 
      console.log(token);
      const { ...others } = rootUser._doc;
      req.token = token;
      req.rootUser = { data: others, success: true };
      req.userId = rootUser._id;
      const data = {
        _id: others._id,
        name: others.name,
        email: others.email,
        contact: others.contact,
        isEmailVerified: others.isEmailVerified,
        profilePic: others.profilePic,
        isMobileVerified: others.isMobileVerified,
        googleId: others.googleId,
      };

      if(rootUser){
        return res.status(200).json({data, success: true });
      }

    //  end of bearer token if
  } catch (error) {
    res.status(401).json({
      message: "Unotherized User: Please login first",
      success: false,
    });
    console.log(error);
  }
};

const createPaymentIntent = async(req,res)=>{
  try {
    let amount = 0;
    const {applicationId} = req.body;
    const application = await ApplicationModel.findById(applicationId);

    if (application.requestedPhase < 3) {
      return res
        .status(400)
        .json({
          message:
            "You can't perform this action right now. You can pay only when admin requests you to submit phase 3 data",
          success: false,
        });
    }

    amount = parseInt(application.phase3.cost);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: "usd",
      payment_method: "pm_card_visa",
    });

    res.send({clientSecret: paymentIntent.client_secret})
    
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
}

const verifyCaptcha = async(req,res)=>{
    const { recaptchaToken } = req.body;

    const secretKey = process.env.CAPTCHA_SECRET_KEY; 

    try {
      const { data } = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`
      );
      console.log(data);

      if (data.success) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    } catch (error) {
      console.error("Error verifying reCAPTCHA:", error);
      res.status(500).json({ success: false });
    }
}



module.exports = {
  signupUser,
  verifyEmail,
  verifyOtp,
  loginUser,
  getAllUsers,
  logoutUser,
  updateMobileVerify,
  updateUserData,
  changePassword,
  forgotPassword,
  verifyResetPasswordLink,
  createNewPassword,
  AuthRoute,
  createPaymentIntent,
  sendmail,
  verifyCaptcha,
};
