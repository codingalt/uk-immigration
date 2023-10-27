const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const cookieParser = require("cookie-parser");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const allowedOrigins = [
  process.env.BASE_URL,
  "https://immigrationmatter.netlify.app",
  "http://localhost:3000",
  "https://immigration-client.netlify.app",
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", true);
  }
  next();
});
require("./conn");
const PORT = process.env.PORT || 5000;
const path = require("path");
const UserModel = require("./Models/UserModel");
const PhaseNotificationModel = require("./Models/PhaseNotification");
const { sendNotification } = require("./Utils/sendNotification");
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

const server = app.listen(PORT, () => {});
// const io = initializeSocket(server);

// Socket IO Code Starts
  const io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: {
      origin: "http://127.0.0.1:3000",
    },
  });

  io.on("connection", (socket) => {
    console.log("Connected to socket.io");

    socket.on("setup", (user) => {
      socket.join(user?.userId);
      socket.emit("connected");
    });

    socket.on("join chat", (room) => {
      socket.join(room);
      console.log("User Joined room", room);
    });

    socket.on("new message", (chat) => {
      if (!chat?.users) return console.log("chat.users is undefined");

      chat.users.forEach((user) => {
        if (user == chat.sender) return;
        socket.in(user).emit("message received", chat);
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

      // Send Notification and Store Request In Database
      sendNotification({
        title: "New Phase Request from Client",
        notificationType: "admin",
        userId: request.userId,
        applicationId: request.applicationId,
      });
      admins.forEach((admin) => {
        socket.in(admin._id.toString()).emit("phase data received", request);
      });
    });

    // Send Notification to Client of phase Approval from Admin
    socket.on("phase notification", async (request) => {
      console.log("Phase Notification", request);
      if (!request) return console.log("Phase Notification is undefined");

      // Send Notification and Store Request In Database
      sendNotification({
        title: request.title,
        notificationType: "client",
        userId: request.userId,
        applicationId: request.applicationId,
        phase: request.phase,
        phaseStatus: request.phaseStatus
      });
        socket.in(request.userId).emit("phase notification received", request);
      
    });

  });

app.get("/", (req, res) => {
  res.send("Api is running successfully");
});
