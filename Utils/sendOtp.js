const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const OtpModel = require("../Models/OtpModel");
router.use(express.json());
const otpGenerator = require("otp-generator");


const sendOtp = async (contact) => {
  try {
    if (!contact) {
      return { message: "Mobile Number cannot be empty",success: false };
    }

    // Generating OTP
    // const otp = otpGenerator.generate(4,{
    //   digits: true,
    //   lowerCaseAlphabets: false,
    //   upperCaseAlphabets: false,
    //   specialChars: false
    // });
    // console.log('OTP',otp);

    const otp = 111111;
    const newOtp = new OtpModel({ contact, otp: otp });
    newOtp.otp = await bcrypt.hash(newOtp.otp, 12);
    const result = await newOtp.save();
    return {result: result, message: "Otp saved successfully",success: true};

    // const accountSid = process.env.TWILIO_SID;
    // const authToken = process.env.TWILIO_TOKEN;
    // const client = require("twilio")(accountSid, authToken);

    //  client.messages
    //   .create({ body: `Your OTP verification code is ${otp}`, from: "+12765337560", to: phone})
    //   .then((message) =>  {
    //     return res.status(200).json({data: 'OTP sent successfully.',success: true})
    //   });
  } catch (err) {
    console.log('Error sending otp', err.message);
  }
};

module.exports = {sendOtp}
