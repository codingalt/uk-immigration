const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   service: "gmail",
//   secure: true,
//   auth: {
//     user: "faheemmalik640@gmail.com",
//     pass: "tvvg vuku jfxk vqah",
//   },
// });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  logger: true,
  debug: true,
  secureConnection: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnAuthorized: false,
  },
});

module.exports = async(email, subject, text)=>{
    try {
        const info = await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: subject,
          text: text,
          html: `<b>Click on the link below to verify your email.</b> <br> ${text} `,
        });

        console.log('Email sent successfully');
        return info;
        
    } catch (err) {
        console.log(err);
    }
}
