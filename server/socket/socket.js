const {
  setIO,
  setSocketId,
  removeSocketId,
  getSocketId,
  getOnlineUsers,
} = require("./socketInstance");

const Message = require("../models/Message");

const socketHandler = (io) => {
  setIO(io);

  io.on("connection", (socket) => {
    console.log("SOCKET CONNECTED:", socket.id);

    socket.on("join", (userId) => {
      if (!userId) {
        console.error(
          "SOCKET JOIN FAILED: User ID missing"
        );
        return;
      }

      const normalizedUserId = String(userId);

      socket.data.userId = normalizedUserId;

      setSocketId(
        normalizedUserId,
        socket.id
      );

      socket.join(normalizedUserId);

      console.log(
        "USER JOINED SOCKET:",
        normalizedUserId,
        socket.id
      );

      io.emit(
        "onlineUsers",
        getOnlineUsers()
      );
    });

    // Receiver opened/received the message
    socket.on(
      "messageDelivered",
      async ({ messageId }) => {
        try {
          if (!messageId) return;

          const message =
            await Message.findById(messageId);

          if (!message) {
            console.error(
              "DELIVERED MESSAGE NOT FOUND:",
              messageId
            );
            return;
          }

          // Read status ni delivered ga downgrade cheyyakudadhu
          if (message.status !== "read") {
            message.status = "delivered";
            await message.save();
          }

          const senderId =
            message.sender?._id ||
            message.sender;

          const senderSocket =
            getSocketId(String(senderId));

          console.log(
            "MESSAGE DELIVERED:",
            messageId
          );

          console.log(
            "SENDER SOCKET:",
            senderSocket
          );

          if (senderSocket) {
            io.to(senderSocket).emit(
              "messageStatusUpdate",
              {
                messageId: String(message._id),
                status: message.status,
              }
            );
          }
        } catch (error) {
          console.error(
            "MESSAGE DELIVERED ERROR:",
            error
          );
        }
      }
    );

    // Optional read receipt
    socket.on(
      "messageRead",
      async ({ messageId }) => {
        try {
          if (!messageId) return;

          const message =
            await Message.findByIdAndUpdate(
              messageId,
              {
                status: "read",
              },
              {
                new: true,
              }
            );

          if (!message) return;

          const senderId =
            message.sender?._id ||
            message.sender;

          const senderSocket =
            getSocketId(String(senderId));

          if (senderSocket) {
            io.to(senderSocket).emit(
              "messageStatusUpdate",
              {
                messageId: String(message._id),
                status: "read",
              }
            );
          }
        } catch (error) {
          console.error(
            "MESSAGE READ ERROR:",
            error
          );
        }
      }
    );

    socket.on(
      "typing",
      ({ receiverId, userId }) => {
        if (!receiverId || !userId) return;

        const receiverSocket =
          getSocketId(String(receiverId));

        if (receiverSocket) {
          io.to(receiverSocket).emit(
            "typing",
            {
              userId: String(userId),
            }
          );
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(
        "SOCKET DISCONNECTED:",
        socket.id
      );

      removeSocketId(socket.id);

      io.emit(
        "onlineUsers",
        getOnlineUsers()
      );
    });
  });
};

module.exports = socketHandler;