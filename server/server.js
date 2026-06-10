const userRoutes = require("./routes/userRoutes");
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

  // JOIN USER
  socket.on("join", (username) => {
    onlineUsers = onlineUsers.filter(
      (user) => user.username !== username
    );

    onlineUsers.push({
      id: socket.id,
      username,
    });

    io.emit("online_users", onlineUsers);
  });


  // PRIVATE MESSAGE
  socket.on("private_message", (data) => {
    console.log("Message:", data);

    const targetUser = onlineUsers.find(
      (u) => u.username === data.receiver
    );

    if (targetUser) {
      io.to(targetUser.id).emit(
        "receive_private_message",
        data
      );
    }


  // TYPING
  socket.on("typing", (data) => {
    console.log("TYPING EVENT:", data);

    const receiver = onlineUsers.find(
      (user) => user.username === data.receiver
    );

    if (receiver) {
      io.to(receiver.id).emit(
        "user_typing",
        data.sender
      );
    }
  });


  // MESSAGE SEEN
  socket.on("message_seen", (data) => {
  console.log("MESSAGE SEEN RECEIVED:", data);

  console.log("ONLINE USERS:", onlineUsers);

  const sender = onlineUsers.find(
    (user) => user.username === data.sender
  );

  console.log("SENDER FOUND:", sender);

  if (sender) {
    io.to(sender.id).emit(
      "message_seen_update",
      {
        receiver: data.receiver,
      }
    );

    console.log("SEEN UPDATE SENT");
  }
});


  // DISCONNECT
  socket.on("disconnect", () => {
    console.log(
      "User Disconnected:",
      socket.id
    );

    onlineUsers = onlineUsers.filter(
      (user) => user.id !== socket.id
    );

    io.emit(
      "online_users",
      onlineUsers
    );
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() =>
    console.log("MongoDB Connected ✅")
  )
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("PingMe API Running 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});