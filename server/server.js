require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const postRoutes = require("./routes/postRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://ping-me-eosin-phi.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

// Middleware
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

// Find user socket
const getUserSocket = (userId) => {
  console.log("Finding socket for:", userId);
  console.log("Current online users:", onlineUsers);

  const user = onlineUsers.find(
    (onlineUser) =>
      onlineUser.userId.toString() === userId.toString()
  );

  console.log("FOUND USER:", user);

  return user?.socketId;
};

app.set("getUserSocket", getUserSocket);

// Socket connection
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // Join
  socket.on("join", (data) => {
    console.log("JOIN DATA:", data);

    onlineUsers = onlineUsers.filter(
      (user) => user.username !== data.username
    );

    onlineUsers.push({
      socketId: socket.id,
      userId: data.userId,
      username: data.username,
      profilePic: data.profilePic,
    });

    console.log("ONLINE USERS:", onlineUsers);

    io.emit("online_users", onlineUsers);
  });

  // Private message
  socket.on("private_message", (data) => {
    const targetUser = onlineUsers.find(
      (user) => user.username === data.receiver
    );

    if (targetUser) {
      io.to(targetUser.socketId).emit(
        "receive_private_message",
        data
      );
    }
  });

  // Typing status
  socket.on("typing", (data) => {
    const receiver = onlineUsers.find(
      (user) => user.username === data.receiver
    );

    if (receiver && receiver.username !== data.sender) {
      io.to(receiver.socketId).emit(
        "user_typing",
        data.sender
      );
    }
  });

  // Message seen
  socket.on("message_seen", (data) => {
    const sender = onlineUsers.find(
      (user) => user.username === data.sender
    );

    if (sender) {
      io.to(sender.socketId).emit(
        "message_seen_update",
        {
          receiver: data.receiver,
        }
      );
    }
  });

  // Disconnect
  socket.on("disconnect", async () => {
    console.log("User Disconnected:", socket.id);

    const disconnectedUser = onlineUsers.find(
      (user) => user.socketId === socket.id
    );

    if (disconnectedUser) {
      const lastSeen = new Date();

      try {
        await User.findByIdAndUpdate(
          disconnectedUser.userId,
          { lastSeen }
        );

        onlineUsers = onlineUsers.filter(
          (user) => user.socketId !== socket.id
        );

        // Update online users
        io.emit("online_users", onlineUsers);

        // Update last seen
        io.emit("user_last_seen", {
          username: disconnectedUser.username,
          lastSeen,
        });

      } catch (error) {
        console.log("Error updating last seen:", error);
      }
    }
  });
});

// Routes
app.get("/", (req, res) => {
  res.send("PingMe API Running 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);

// Static uploads
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 5000;

// MongoDB connection and server start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Error ❌", error);
  });