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
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("send_message", (data) => {
    io.emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
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