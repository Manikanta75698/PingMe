const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://ping-me-eosin-phi.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ping-me-eosin-phi.vercel.app",
    ],
  })
);
app.use(express.json());
let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("join", (username) => {
    onlineUsers.push({
      id: socket.id,
      username,
    });

    io.emit("online_users", onlineUsers);
  });

  socket.on("send_message", (data) => {
    io.emit("receive_message", data);
  });
  socket.on("typing", (username) => {
  socket.broadcast.emit(
    "user_typing",
    username
  );
});

  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);

    onlineUsers = onlineUsers.filter(
      (user) => user.id !== socket.id
    );

    io.emit("online_users", onlineUsers);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("PingMe API Running 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});