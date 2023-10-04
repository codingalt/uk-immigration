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
  type: "SMTP",
  secure: true,
  logger: true,
  debug: true,
  secureConnection: true,
  auth: {
    user: "faheemmalik640@gmail.com",
    pass: "paho tctl xadt lnjo",
  },
  tls: {
    rejectUnAuthorized: false,
  },
});

const sendEmail = async(email, subject, text, html)=>{
    try {
      const info = await transporter.sendMail({
        from: "faheemmalik640@gmail.com",
        to: email,
        subject: subject,
        text: text,
        html: html,
      });

      console.log("Email sent successfully");
      return info;
    } catch (err) {
      console.log(err);
    }
}

// module.exports = async(email, subject, text, html)=>{
//     try {
 
//         const info = await transporter.sendMail({
//           // from: "faheemmalik640@gmail.com",
//           to: email,
//           subject: subject,
//           text: text,
//           html: html,
//         });

//         console.log('Email sent successfully');
//         return info;
        
//     } catch (err) {
//         console.log(err);
//     }
// }

module.exports = {sendEmail}
