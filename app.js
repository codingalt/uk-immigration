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

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/Uploads", express.static("Uploads"));

app.use(
  cors({
    // origin: [process.env.BASE_URL, "http://127.0.0.1:5173"],
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
  })
);

app.use((req,res,next)=>{
  res.setHeader("Access-Control-Allow-Origin", "*");
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

app.get("/", (req, res) => {
  res.send("Api is running successfully");
});

// Socket IO Code Starts 
  const io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: {
      origin: "http://localhost:3000",
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
    socket.on("send phase data", async(request) => {
      console.log("send phase data", request);
      if (!request) return console.log("Phase Data Request is undefined");
      const admins = await UserModel.find({isAdmin: true});

      // Store Request In Database
      const notification = await new PhaseNotificationModel({userId: request.userId, applicationId: request.applicationId}).save(); 
      admins.forEach((admin) => {
        socket.in(admin._id.toString()).emit("phase data received", request);
      });
    });


  });