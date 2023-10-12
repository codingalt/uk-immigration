const nodemailer = require("nodemailer");

let testAccount = new nodemailer.createTestAccount();
// const transporter = nodemailer.createTransport({
//   host: "smtp.ethereal.email",
//   port: 587,
//   auth: {
//     user: "makenna.mraz95@ethereal.email",
//     pass: "dJjgZzwGgAQqgk1H6V",
//   },
// });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  service: "hotmail",
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

const sendEmail = async(email, subject, text, html)=>{
    try {
      const info = await transporter.sendMail({
        from: "UK Immigration <clara59@ethereal.email>",
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
