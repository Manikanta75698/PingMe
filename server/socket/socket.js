const {
  setIO,
  setSocketId,
  removeSocketId,
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
          const currentUserId = String(
            socket.data.userId || ""
          );

          if (!messageId || !currentUserId) return;

          const message = await Message.findOne({
            _id: messageId,
            receiver: currentUserId,
          });

          if (!message) {
            console.error(
              "DELIVERED MESSAGE NOT FOUND OR UNAUTHORIZED:",
              messageId
            );
            return;
          }

          // Read status ni delivered ki downgrade cheyyakudadhu
          if (
            message.status !== "read" &&
            message.status !== "delivered"
          ) {
            message.status = "delivered";
            await message.save();
          }

          const senderId = String(
            message.sender?._id ||
            message.sender
          );

          io.to(senderId).emit(
            "messageStatusUpdate",
            {
              messageId: String(message._id),
              status: message.status,
            }
          );
        } catch (error) {
          console.error(
            "MESSAGE DELIVERED ERROR:",
            error
          );
        }
      }
    );


    socket.on(
      "messageRead",
      async ({ messageId }) => {
        try {
          const currentUserId = String(
            socket.data.userId || ""
          );

          if (!messageId || !currentUserId) return;

          const message =
            await Message.findOneAndUpdate(
              {
                _id: messageId,
                receiver: currentUserId,
              },
              {
                $set: {
                  status: "read",
                },
              },
              {
                new: true,
              }
            );

          if (!message) {
            console.error(
              "READ MESSAGE NOT FOUND OR UNAUTHORIZED:",
              messageId
            );
            return;
          }

          const senderId = String(
            message.sender?._id ||
            message.sender
          );

          io.to(senderId).emit(
            "messageStatusUpdate",
            {
              messageId: String(message._id),
              status: "read",
            }
          );
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

        io.to(String(receiverId)).emit(
          "typing",
          {
            userId: String(userId),
          }
        );
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