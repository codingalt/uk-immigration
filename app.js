const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const cookieParser = require("cookie-parser");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
require("./conn");
const PORT = process.env.PORT || 5000;
const path = require("path");
const UserModel = require("./Models/UserModel");
const PhaseNotificationModel = require("./Models/PhaseNotification");
const { sendNotification } = require("./Utils/sendNotification");
const {initializeSocket} = require("./socket")

app.use(cookieParser());
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use("/Uploads", express.static("Uploads"));

app.use(
  cors({
    // origin: [process.env.BASE_URL, "http://127.0.0.1:5173"],
    origin: "https://immigrationmatter.netlify.app",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
  })
);

app.use((req,res,next)=>{
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://immigrationmatter.netlify.app"
  );
  res.setHeader("Access-Control-Allow-Credentials: true");
  res.setHeader("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
  next();
})

// Linking Routes
app.use(require("./Routes/UserRoute"));
app.use(require("./Routes/ApplicationRoutes"));
app.use(require("./Routes/ChatRoute"));
app.use(require("./Routes/CaseWorkerRoute"));
app.use(require("./Routes/PaymentRoute"));
app.use(require("./Routes/PhaseNotificationRoute"));

const server = app.listen(PORT, () => {});
const io = initializeSocket(server);

module.exports = {server}

app.get("/", (req, res) => {
  res.send("Api is running successfully");
});
