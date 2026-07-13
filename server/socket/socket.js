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
    console.log(
      "SOCKET CONNECTED:",
      socket.id
    );

    /* =========================
       JOIN USER ROOM
    ========================= */

    socket.on("join", (userId) => {
      if (!userId) {
        console.error(
          "SOCKET JOIN FAILED: User ID missing"
        );
        return;
      }

      const normalizedUserId =
        String(userId);

      socket.data.userId =
        normalizedUserId;

      setSocketId(
        normalizedUserId,
        socket.id
      );

      socket.join(
        normalizedUserId
      );

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

    /* =========================
    DELIVERED
 ========================= */

    socket.on(
      "messageDelivered",
      async ({ messageId }) => {
        try {
          const currentUserId = String(
            socket.data.userId || ""
          );

          if (!messageId || !currentUserId) {
            return;
          }

          const message =
            await Message.findOneAndUpdate(
              {
                _id: messageId,
                receiver: currentUserId,
                status: "sent",
              },
              {
                $set: {
                  status: "delivered",
                },
              },
              {
                new: true,
                runValidators: true,
              }
            );

          /*
           * Message already delivered/read ayithe
           * malli delivered event emit cheyyakudadhu.
           */
          if (!message) {
            return;
          }

          const senderId = String(
            message.sender
          );

          io.to(senderId).emit(
            "messageStatusUpdate",
            {
              messageId: String(
                message._id
              ),
              status: "delivered",
            }
          );

          console.log(
            "MESSAGE DELIVERED:",
            messageId
          );
        } catch (error) {
          console.error(
            "MESSAGE DELIVERED ERROR:",
            error
          );
        }
      }
    );

    /* =========================
       READ
    ========================= */

    socket.on(
      "messageRead",
      async ({ messageId }) => {
        try {
          const currentUserId =
            String(
              socket.data.userId || ""
            );

          if (
            !messageId ||
            !currentUserId
          ) {
            return;
          }

          const message =
            await Message.findOneAndUpdate(
              {
                _id: messageId,
                receiver:
                  currentUserId,
              },
              {
                $set: {
                  status: "read",
                },
              },
              {
                new: true,
                runValidators: true,
              }
            );

          if (!message) {
            console.error(
              "READ MESSAGE NOT FOUND OR UNAUTHORIZED:",
              messageId
            );
            return;
          }

          const senderId =
            String(message.sender);

          io.to(senderId).emit(
            "messageStatusUpdate",
            {
              messageId: String(
                message._id
              ),
              status: "read",
            }
          );

          console.log(
            "MESSAGE READ:",
            messageId
          );
        } catch (error) {
          console.error(
            "MESSAGE READ ERROR:",
            error
          );
        }
      }
    );

    /* =========================
       TYPING
    ========================= */

    socket.on(
      "typing",
      ({ receiverId, userId }) => {
        if (
          !receiverId ||
          !userId
        ) {
          return;
        }

        io.to(
          String(receiverId)
        ).emit("typing", {
          userId: String(userId),
        });
      }
    );

    /* =========================
       DISCONNECT
    ========================= */

    socket.on(
      "disconnect",
      () => {
        console.log(
          "SOCKET DISCONNECTED:",
          socket.id
        );

        removeSocketId(
          socket.id
        );

        io.emit(
          "onlineUsers",
          getOnlineUsers()
        );
      }
    );
  });
};

module.exports = socketHandler;