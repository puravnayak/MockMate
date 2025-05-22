const express = require("express");
const connectDB = require("./db");
const questionRoutes = require("./questionroute");
const authRoutes = require("./authRoute");
const { authenticateUser } = require("./authMiddleware");
require("dotenv").config();
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");

const app = express();
connectDB();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:4001",
    methods: ["GET", "POST"],
  },
});

httpServer.listen(3001, () => {
  console.log("Socket server running on port 3001");
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Leetcode Clone API is Running!");
});

app.use("/questions", authenticateUser, questionRoutes);
app.use("/auth", authRoutes);

const PORT = 4000;
app.listen(PORT, () => console.log(`REST API server running on port ${PORT}`));

const currentRooms = new Map(); // Stores code history
const roomUsers = new Map(); // Stores user roles
const roomTimers = new Map(); // ✅ Stores timer states

io.on("connection", (socket) => {
  console.log(socket.id, "connected");

  setInterval(() => {
    socket.emit("test", { message: "Hello from server" });
  }, 1000);

  socket.on("join-user", (userInfo) => {
    console.log(userInfo.username, "joined", userInfo.roomID);
    console.log(userInfo.code);
    const roomID = userInfo.roomID;
    socket.join(roomID);

    if (!currentRooms.has(roomID)) {
      currentRooms.set(roomID, userInfo.code);
    } else {
      console.log(userInfo.username, "was sent the code history", currentRooms.get(roomID));
      socket.emit("update-code-client", { newCode: currentRooms.get(roomID) });
    }
  });

  socket.on("update-code-server", (info) => {
    const code = info.code;
    const roomID = info.roomID;
    currentRooms.set(roomID, code);
    socket.to(roomID).emit("update-code-client", { newCode: code });
    console.log(roomID, currentRooms.get(roomID));
  });

  socket.on("send-input-server", ({ roomID, input }) => {
    socket.to(roomID).emit("send-input-client", { input });
  });

  socket.on("disconnect", () => {
    console.log(socket.id, "disconnected");
  });

  socket.on("language-change-toServer", (info) => {
    const roomID = info.roomID;
    const newLanguage = info.newLanguage;
    socket.to(roomID).emit("language-change-toClient", newLanguage);

    const LANGUAGE_DEFAULTS = {
      javascript: "console.log('Hello World');",
      python: "print('Hello World')",
      cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello World";\n    return 0;\n}',
      java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
    };

    console.log("Language was changed");
    const newCode = LANGUAGE_DEFAULTS[newLanguage];
    currentRooms.set(roomID, newCode);
  });

  socket.on("runCode-toServer", (roomID) => {
    socket.to(roomID).emit("runCode-toClient");
  });

  socket.on("changed-tabs-server", (roomID)=>{
    socket.to(roomID).emit("changed-tabs-client");
    console.log("tabs changed");
  })
  socket.on("disable-input-server", (roomID)=>{
    socket.to(roomID).emit("disable-input-client");
  })
  socket.on("enable-input-server", (roomID)=>{
    socket.to(roomID).emit("enable-input-client");
  })
  // ✅ Sync Timer Updates
  socket.on("update-timer-server", ({ roomID, timeLeft, isRunning }) => {
    console.log(`⏳ Timer Updated in ${roomID} → Time Left: ${timeLeft}, Running: ${isRunning}`);

    // Store the latest timer state
    roomTimers.set(roomID, { timeLeft, isRunning });

    // Broadcast update to everyone in the room
    io.to(roomID).emit("update-timer-client", { timeLeft, isRunning });
  });

  socket.on("send-seconds-server", ({ value, roomID }) => {
    socket.to(roomID).emit("send-seconds-client", { value });
  });

  socket.on("send-minutes-server", ({ value, roomID }) => {
    socket.to(roomID).emit("send-minutes-client", { value });
  });

  socket.on("send-hours-server", ({ value, roomID }) => {
    socket.to(roomID).emit("send-hours-client", { value });
  });

  socket.on("send-reset-server", ({ roomID }) => {
    console.log(`🔄 Reset Timer in Room ${roomID}`);
    roomTimers.set(roomID, { timeLeft: 0, isRunning: false });
    io.to(roomID).emit("update-timer-client", { timeLeft: 0, isRunning: false });
  });
  socket.on("question-selected-ToServer", ({ question, roomID }) => {
    console.log("New question:", question, roomID);
    socket.to(roomID).emit("question-selected-toClient", question);
  });
  socket.on("disconnect", () => {
    let roomID = null;
    let userRole = null;
    let username = socket.data.username;

    if (!username) {
      console.log(`${socket.id} disconnected (No username found)`);
      return;
    }

    for (const [room, users] of roomUsers.entries()) {
      if (users.interviewer === username) {
        userRole = "interviewer";
        roomID = room;
        users.interviewer = null;
      } else if (users.interviewee === username) {
        userRole = "interviewee";
        roomID = room;
        users.interviewee = null;
      }
    }

    if (roomID && userRole) {
      io.to(roomID).emit("user-left", { role: userRole });
      console.log(`❌ ${userRole} (${username}) left room ${roomID}`);
    }

    console.log(socket.id, "disconnected");
  });
});
