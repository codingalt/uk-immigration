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
// const {SMTPClient} = require("emailjs")
var postmark = require("postmark");
const ApplicationModel = require("../Models/ApplicationModel");
var client = new postmark.Client("<server key>");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  type: "SMTP",
  secure: true,
  logger: true,
  debug: true,
  secureConnection: false,
  auth: {
    user: "faheemmalik640@gmail.com",
    pass: "paho tctl xadt lnjo",
  },
  tls: {
    rejectUnAuthorized: false,
  },
});


const signupUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, contact, referringAgent,fcmToken} =
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

        // Normal Signup 
                if (
                  !name ||
                  !email ||
                  !password ||
                  !confirmPassword ||
                  !contact
                ) {
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

                //  Saving token to emailToken model
                const emailToken = await new EmailTokenModel({
                  userId: user._id,
                  token: crypto.randomBytes(32).toString("hex"),
                }).save();
                const url = `${process.env.BASE_URL}/${user._id}/verify/${emailToken.token}`;
                const html = `<b>Click on the link below to verify your email.</b> <br> ${url}`;
                const info = await sendEmail(user.email, "Verify Email", "",html);
                console.log(info);
                
                if(info){
                  console.log("Email sent successfully");
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

                  res.status(200).json({
                    user: result,
                    message: "Please Check your Email to verify your account",
                    success: true,
                  });
                }else{
                  await UserModel.findByIdAndDelete(user._id);
                  await EmailTokenModel.findByIdAndDelete(emailToken._id);
                  return res.status(500).json({message: "Error Sending Email", success: false});
                }

      }


  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

const verifyEmail = async(req,res)=>{
    try {

        const {id,token} = req.params;
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
      if(result){
        return res.status(200).json({message: "An Email has been sent to your email to Recover your password.", success: true})
      }else{
        return res.status(500).json({message: "Error Sending Email.", success: false})
      }

    
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
            const info = await sendEmail(signin.email, "Verify Email", url);
            
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
};
