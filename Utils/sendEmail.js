const nodemailer = require("nodemailer");

// let testAccount = new nodemailer.createTestAccount();
// const transporter = nodemailer.createTransport({
//   host: "smtp.ethereal.email",
//   port: 587,
//   auth: {
//     user: "makenna.mraz95@ethereal.email",
//     pass: "dJjgZzwGgAQqgk1H6V",
//   },
// });

// const transporter = nodemailer.createTransport({
//   host: "maxxswap.com",
//   port: 465,
//   type: "SMTP",
//   secure: true,
//   logger: true,
//   debug: true,
//   // secureConnection: false,
//   auth: {
//     user: "support@maxxswap.com",
//     pass: "max_swap@1234",
//   },
//   tls: {
//     rejectUnAuthorized: false,
//   },
// });

const transporter = nodemailer.createTransport({
  host: process.env.HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async(email, subject, text, html)=>{
    try {
      const info = await transporter.sendMail({
        from: {
          address: "testmailingsmtp@lesoft.io",
          name: "Lesoft",
        },
        to: email,
        subject: subject,
        text: text,
        html: html,
      });

      console.log("Email sent successfully");
      // return info;
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
