
const {
  setSocketId,
  removeSocketId,
  getSocketId,
} = require("./socketInstance");

const Message = require("../models/Message");

const users = new Map();

const socketHandler = (io) => {

  io.on("connection", (socket) => {

    console.log("User Connected:", socket.id);

    // =========================
    // JOIN USER (SAFE)
    // =========================
    socket.on("join", (userId) => {
  console.log("JOIN EVENT:", userId);

  if (!userId) return;

  users.set(userId.toString(), socket.id);
  setSocketId(userId, socket.id);

  console.log("ONLINE USERS:", [...users.keys()]);

  io.emit("online-users", [...users.keys()]);
});

    // =========================
    // MESSAGE DELIVERED
    // =========================
    socket.on("messageDelivered", async ({ messageId }) => {
      console.log("DELIVERED EVENT:", messageId);

      try {
        if (!messageId) return;

        const message = await Message.findByIdAndUpdate(
          messageId,
          { status: "delivered" },
          { new: true }
        );

        if (!message) return;

        const senderSocket = getSocketId(message.sender.toString());

        console.log(
          "Sender:",
          message.sender.toString(),
          "Socket:",
          senderSocket
        );

        if (senderSocket) {
          io.to(senderSocket).emit("messageStatusUpdate", {
            messageId,
            status: "delivered",
          });
        }
      } catch (err) {
        console.log("Delivered Error:", err);
      }
    });

    // =========================
    // MESSAGE SEEN
    // =========================
    socket.on("messageSeen", async ({ messageId }) => {
      try {
        if (!messageId) return;

        const message = await Message.findByIdAndUpdate(
          messageId,
          { status: "seen" },
          { new: true }
        );

        if (!message) return;

        const senderSocket = getSocketId(message.sender?.toString());

        if (senderSocket) {
          io.to(senderSocket).emit("messageStatusUpdate", {
            messageId,
            status: "seen",
          });
        }

      } catch (err) {
        console.log("Seen Error:", err);
      }
    });

    // =========================
    // TYPING INDICATOR (SAFE)
    // =========================
    socket.on("typing", ({ receiverId }) => {
      try {
        if (!receiverId) return;

        const receiverSocket = users.get(receiverId);

        if (receiverSocket) {
          io.to(receiverSocket).emit("typing", {
            userId: socket.id,
          });
        }

      } catch (err) {
        console.log("Typing Error:", err);
      }
    });

    // =========================
    // DISCONNECT USER
    // =========================
    socket.on("disconnect", () => {

      for (const [userId, socketId] of users) {

        if (socketId === socket.id) {

          users.delete(userId);
          removeSocketId(userId);
          break;

        }

      }

      io.emit("online-users", [...users.keys()]);
      console.log("Disconnected");

    });

  });

};

module.exports = socketHandler;