const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

const socketHandler = require("./socket/socket");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const storyRoutes = require("./routes/storyRoutes");
const messageRoutes = require("./routes/messageRoutes");

const userRoutes = require("./routes/userRoutes");
const startDeleteExpiredMessages = require("./cron/deleteExpiredMessages");
const chatRequestRoutes = require("./routes/chatRequestRoutes");

connectDB();


const app = express();
const server = http.createServer(app);

const normalizeOrigin = (value) =>
  value ? value.replace(/\/+$/, "") : "";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost",
  "capacitor://localhost",
  normalizeOrigin(process.env.CLIENT_PRODUCTION_URL),
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin || origin === "null") {
    return true;
  }

  return allowedOrigins.includes(
    normalizeOrigin(origin)
  );
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    console.error(
      "CORS BLOCKED ORIGIN:",
      origin
    );

    callback(
      new Error(
        `Origin not allowed: ${origin}`
      )
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],
};

// Middleware Pipeline
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// REST Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chat-requests", chatRequestRoutes);
app.use("/api/users", userRoutes);


// Test Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 PingMe V2 Backend is Running in Production Mode...",
  });
});

const PORT = process.env.PORT || 5000;

// Socket.io Config Connection Secure Lock Setup
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      console.error(
        "SOCKET CORS BLOCKED:",
        origin
      );

      callback(
        new Error(
          `Socket origin not allowed: ${origin}`
        )
      );
    },

    credentials: true,

    methods: ["GET", "POST"],
  },

  connectionStateRecovery: {
    maxDisconnectionDuration:
      2 * 60 * 1000,

    skipMiddlewares: true,
  },

  pingTimeout: 60000,
  pingInterval: 25000,
});

socketHandler(io);

server.listen(PORT, () => {
  console.log(`✅ Production Secure Engine running on port: ${PORT}`);
});