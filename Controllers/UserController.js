const EmailTokenModel = require("../Models/EmailToken");
const UserModel = require("../Models/UserModel");
const OtpModel = require("../Models/OtpModel");
const crypto = require("crypto");
const sendEmail = require("../Utils/sendEmail");
const { sendOtp } = require("../Utils/sendOtp");
const bcrypt = require("bcryptjs");
const axios = require("axios");

// Access token 
//ya29.a0AfB_byCsYw38A280fX5pdQwbBPPvk-iuq6_WACqK1NjT5bmue2z8VFI65Xe7-nx6wQudhTXz9G8BdrL2mvYUidfDFoho-l0RGh7pQyvQaLqz_SRVCEloY20aJ4oD9_2FC0CxcF35mHLffEa6wBq3FjU2ONamgrGjBgaCgYKAdcSARESFQGOcNnCz1dJVxmGlKEhglmocdXIhQ0169
// const googleAccessToken =
//   "ya29.a0AfB_byCsYw38A280fX5pdQwbBPPvk-iuq6_WACqK1NjT5bmue2z8VFI65Xe7-nx6wQudhTXz9G8BdrL2mvYUidfDFoho-l0RGh7pQyvQaLqz_SRVCEloY20aJ4oD9_2FC0CxcF35mHLffEa6wBq3FjU2ONamgrGjBgaCgYKAdcSARESFQGOcNnCz1dJVxmGlKEhglmocdXIhQ0169";
const googleAccessToken = undefined;

const signupUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, contact, referringAgent} =
      req.body;
      
      if (googleAccessToken){
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
            name: data?.given_name,
            email: data?.email,
            isEmailVerified: data?.email_verified,
          });
          const token = await user.generateAuthToken();
          await user.save();
          res.cookie("ukImmigrationJwtoken", token, {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            httpOnly: true,
          });
          return res.status(200).json({message:"Signup successful", success: true});
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
                });
                const token = await user.generateAuthToken();
                await user.save();

                //  Saving token to emailToken model
                const emailToken = await new EmailTokenModel({
                  userId: user._id,
                  token: crypto.randomBytes(32).toString("hex"),
                }).save();
                const url = `${process.env.BASE_URL}/users/${user._id}/verify/${emailToken.token}`;
                const info = await sendEmail(user.email, "Verify Email", url);

                if(info){
                  //  Send 6 digit OTP and save in the database
                  const otpSend = await sendOtp(user.contact);
                  res.status(200).json({
                    message: "Please Check your Email to verify your account",
                    success: true,
                  });
                }else{
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
    const { name, email, contact } = req.body;
    const files = req.files;
    console.log(files);
    if(files.profilePic){
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
    if(!password || !confirmPassword || !currentPassword) return res.status(400).json({message: "Please fill out all the fields properly.", success: false});

    if(password != confirmPassword) return res.status(400).json({message: "New Password do not match.", success: false});

    const user = await UserModel.findById(userId).select({
      password: true,
      email: true,
      isEmailVerified: true,
    });

    console.log(user);
    // If password does not exist | User signed up with google account 
    if(!user.password) return res.status(400).json({message: "Password does not exist. You are signed in with google.", success: false});

    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    
    if(!isPasswordMatch) return res.status(400).json({message: "Your current password is wrong. Click forgot password to change.", success: false});
    
    // Otherwise Change Password 
    await UserModel.updateOne({ _id: userId }, { password: password });
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

        //Generating JSON web token
       const token = await signin.generateAuthToken();
        res.cookie("ukImmigrationJwtoken", token, {
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          httpOnly: true,
        });

        return res.status(200).json({message:'Login Successfully', success: true});
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

      if (signin) {
        const isMatch = await bcrypt.compare(password, signin.password);
        if (isMatch) {

          // Check If he is Admin
          if (signin.isAdmin) {
            //Generating JSON web token
            token = await signin.generateAuthToken();
            res.cookie("ukImmigrationJwtoken", token, {
              expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              httpOnly: true,
            });
             return res.status(200).json({isAdmin: true, success: true});
          }

          // Check if he is case worker
          if (signin.isCaseWorker) {
            //Generating JSON web token
            token = await signin.generateAuthToken();
            res.cookie("ukImmigrationJwtoken", token, {
              expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              httpOnly: true,
            });
            return res.status(200).json({isCaseWorker: true, success: true});

          }

          // Else Login as a normal user 
          if (!signin.isEmailVerified) {
            //  Saving token to emailToken model
            const emailToken = await new EmailTokenModel({
              userId: signin._id,
              token: crypto.randomBytes(32).toString("hex"),
            }).save();
            const url = `${process.env.BASE_URL}/users/${signin._id}/verify/${emailToken.token}`;
            await sendEmail(signin.email, "Verify Email", url);
            return res.status(400).json({
              message:
                "To continue login, Please verify your email. A Verification link has been sent to your email.",
              success: false,
            });
          }
          //Generating JSON web token
          token = await signin.generateAuthToken();
          res.cookie("ukImmigrationJwtoken", token, {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            httpOnly: true,
          });
          return res.status(200).json({
            message: "Login Successfully",
            success: true,
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
    res.status(200).json({ message:"Logout Successfully", success: true });
  } catch (err) {
       res.status(500).json({ message: err.message, success: false });
  }
};

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
  createNewPassword
};
