const socketIO = require("socket.io");
const { sendNotification } = require("./Utils/sendNotification");

// Initialize io and pass the server instance
function initializeSocket(server) {
  // Socket IO Code Starts
  const io = socketIO(server, {
    pingTimeout: 60000,
    cors: {
      origin: "http://localhost:3000",
    },
  });

  console.log("io instance created");

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
        title: "Phase Data Request",
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
        userId: request.userId,
        applicationId: request.applicationId,
      });
        socket.in(request.userId).emit("phase notification received", request);
      
    });

  });

return io;

}

module.exports = { initializeSocket };