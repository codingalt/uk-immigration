const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const cookieParser = require("cookie-parser");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
require("./conn");
const fs = require("fs");
const allowedOrigins = [
  process.env.BASE_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "https://immigration-client.netlify.app",
  "https://admin-immigration.netlify.app",
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", true);
  }
  next();
});
const path = require("path");
const UserModel = require("./Models/UserModel");
const PhaseNotificationModel = require("./Models/PhaseNotification");
const { sendNotification, sendNotificationToCaseWorker } = require("./Utils/sendNotification");
const cron = require("node-cron");
// const {initializeSocket} = require("./socket")

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use("/Uploads", express.static("Uploads"));
app.use(cookieParser());

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);



// Linking Routes
app.use(require("./Routes/UserRoute"));
app.use(require("./Routes/ApplicationRoutes"));
app.use(require("./Routes/ChatRoute"));
app.use(require("./Routes/CaseWorkerRoute"));
app.use(require("./Routes/PaymentRoute"));
app.use(require("./Routes/PhaseNotificationRoute"));
app.use(require("./Routes/CompanyRoute"));
app.use(require("./Routes/CompanyClientApplicationRoute"));
app.use(require("./Routes/EventRoute"));

const server = app.listen(PORT, () => {});

function loadExpirationTimestamp() {
  try {
    const data = fs.readFileSync("expiration.json", "utf8");
    return parseInt(data);
  } catch (err) {
    // If file doesn't exist or there's an error, default to 45 days from now
    const expirationTimestamp = new Date().getTime() + 25 * 24 * 60 * 60 * 1000;
    saveExpirationTimestamp(expirationTimestamp);
    return expirationTimestamp;
  }
}

function saveExpirationTimestamp(timestamp) {
  fs.writeFileSync("expiration.json", timestamp.toString());
}


// Load or initialize the expiration timestamp
let expirationTimestamp = loadExpirationTimestamp();

app.get("/timeleft", (req, res) => {
  const currentTime = new Date().getTime();
  const remainingTime = expirationTimestamp - currentTime;

  if (remainingTime > 0) {
    res.json({
      status: "active",
      remainingTime: remainingTime,
    });
  } else {
    res.json({
      status: "expired",
      message: "Time Completed"
    });
  }
});

// const io = initializeSocket(server);

// Socket IO Code Starts
  const io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: {
      origin: allowedOrigins,
    },
  });

  io.on("connection", (socket) => {
    console.log("Connected to socket.io");

    socket.on("setup", (user) => {
      socket.join(user?._id);
      socket.emit("connected");
    });

    socket.on("join chat", (room) => {
      socket.join(room);
      console.log("User Joined room", room);
    });

    // socket.on("read notification", (noti) => {
    //   console.log("Read Notification", noti);
    // });

    socket.on("new message", (chat) => {
      if (!chat?.users) return console.log("chat.users is undefined");
      console.log("chat", chat.users);
      console.log("chat sender", chat.result.sender);
      chat.users.forEach((user) => {
        if (user == chat.result.sender) return;
        socket.in(user).emit("message received", chat);
        socket.in(user).emit("message notification", chat);
      });
    });

    socket.off("setup", () => {
      console.log("User Disconnected");
      socket.leave(user.userId);
    });

    // Send Notification Of Client to Admin for Phase Approval
    socket.on("send phase data", async (request) => {
      console.log("send phase data", request);
      if (!request) return console.log("Phase Data Request is undefined");
      const admins = await UserModel.find({ isAdmin: true });

      admins.forEach((admin) => {
        socket.in(admin._id.toString()).emit("phase data received", request);
      });

      // Send Notification and Store Request In Database
      await sendNotification({
        title: "New Phase Request from Client",
        notificationType: "admin",
        userId: request.userId,
        applicationId: request.applicationId,
        phase: request.phase,
      });
    });

    // Send Notification to Case Worker for Assigned cases
    socket.on("send noti to caseworker", async (request) => {
      console.log("Case worker notification", request);
      if (!request) return console.log("Case worker notification is undefined");

      socket.in(request.caseWorkerId).emit("caseworker noti received", request);

      // Send Notification and Store Request In Database
      await sendNotificationToCaseWorker({
        title: "New Assigned Case",
        notificationType: "admin",
        userId: request.userId,
        applicationId: request.applicationId,
        phase: request.phase,
        caseWorkerId: request.caseWorkerId,
      });
    });

    // Send Notification to Client of phase Approval from Admin
    socket.on("phase notification", async (request) => {
      console.log("Phase Notification", request);
      if (!request) return console.log("Phase Notification is undefined");

      // Send Notification and Store Request In Database
      sendNotification({
        title: "Admin respond to your Application",
        notificationType: "client",
        userId: request.userId,
        applicationId: request.applicationId,
        phase: request.phase,
        phaseStatus: request.phaseStatus,
        phaseSubmittedByClient: request.phaseSubmittedByClient,
        reSubmit: request.reSubmit,
      });
      socket.in(request.userId).emit("phase notification received", request);
    });

    // Request for phase from Admin
    socket.on("phase request", async (request) => {
      if (!request) return console.log("Phase Request from admin is undefined");

      socket.in(request.userId).emit("phase request received", request);
    });
  });

app.get("/", (req, res) => {
  res.send("Api is running successfully");
});
