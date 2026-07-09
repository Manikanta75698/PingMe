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
const { setIO } = require("./socket/socketInstance");
const userRoutes = require("./routes/userRoutes");
const startDeleteExpiredMessages = require("./cron/deleteExpiredMessages");

connectDB();




const app = express();
const server = http.createServer(app);

// 💡 PRODUCTION CORS CONFIGURATION LIST SYSTEM
const allowedOrigins = [
  "http://localhost:5173", // Local Vite Web App Dev
  "http://localhost",      // Capacitor Android Device Engine System Default Web Wrapper Domain Base
  "capacitor://localhost", // Capacitor Native iOS Runtime Domain Target Setup Base
  process.env.CLIENT_PRODUCTION_URL // Live Server App Custom Domain URL Integration String System Variable
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Standard target systems dynamic loop validation headers arrays processing
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin === 'null') {
      callback(null, true);
    } else {
      callback(new Error("🚫 Security Block: Request Origin Domain Not Allowed by PingMe CORS Layer."));
    }
  },
  credentials: true, // Required for cookies/sessions parsing through headers matrix layer structure
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
    origin: allowedOrigins,
    credentials: true
  },
});

setIO(io);
socketHandler(io);

server.listen(PORT, () => {
  console.log(`✅ Production Secure Engine running on port: ${PORT}`);
});