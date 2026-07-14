const {
  setIO,
  setSocketId,
  removeSocketId,
  getOnlineUsers,
} = require("./socketInstance");

const {
  authenticateSocket,
} = require("../middleware/authMiddleware");

const Message = require("../models/Message");

const TYPING_TIMEOUT_MS = 2500;

const normalizeId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    const nestedValue =
      value?._id ||
      value?.id ||
      value?.userId;

    if (nestedValue) {
      return String(
        nestedValue
      ).trim();
    }

    /*
     * Mongoose ObjectId support.
     */
    if (
      typeof value.toString ===
      "function"
    ) {
      const stringValue =
        value.toString();

      if (
        stringValue &&
        stringValue !==
        "[object Object]"
      ) {
        return stringValue.trim();
      }
    }

    return "";
  }

  return String(value).trim();
};

const socketHandler = (io) => {
  setIO(io);

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const authenticatedUserId =
      normalizeId(
        socket.data?.userId ||
        socket.userId ||
        socket.user?._id
      );

    if (!authenticatedUserId) {
      console.error(
        "SOCKET CONNECTION REJECTED: Authenticated user ID missing",
        socket.id
      );

      socket.disconnect(true);
      return;
    }

    socket.data.userId =
      authenticatedUserId;

    socket.data.typingReceiverId =
      "";

    socket.data.typingTimer =
      null;

    /*
     * JWT nunchi vachina user ID room lo
     * automatic ga join chestham.
     */
    setSocketId(
      authenticatedUserId,
      socket.id
    );

    socket.join(
      authenticatedUserId
    );

    console.log(
      "AUTHENTICATED USER SOCKET JOINED:",
      authenticatedUserId,
      socket.id
    );

    io.emit(
      "onlineUsers",
      getOnlineUsers()
    );

    const clearTypingTimer = () => {
      if (!socket.data.typingTimer) {
        return;
      }

      clearTimeout(
        socket.data.typingTimer
      );

      socket.data.typingTimer = null;
    };

    const stopTypingForReceiver = (
      receiverIdValue
    ) => {
      const senderId =
        normalizeId(
          socket.data.userId
        );

      const receiverId =
        normalizeId(
          receiverIdValue ||
          socket.data
            .typingReceiverId
        );

      clearTypingTimer();

      if (
        socket.data
          .typingReceiverId ===
        receiverId
      ) {
        socket.data.typingReceiverId =
          "";
      }

      if (
        !senderId ||
        !receiverId ||
        senderId === receiverId
      ) {
        return;
      }

      io.to(receiverId).emit(
        "typing:stop",
        {
          userId: senderId,
        }
      );
    };

    const startTypingForReceiver = (
      receiverIdValue
    ) => {
      const senderId =
        normalizeId(
          socket.data.userId
        );

      const receiverId =
        normalizeId(
          receiverIdValue
        );

      if (
        !senderId ||
        !receiverId ||
        senderId === receiverId
      ) {
        return;
      }

      const previousReceiverId =
        normalizeId(
          socket.data
            .typingReceiverId
        );

      /*
       * User vere conversation ki
       * switch ayithe previous receiver
       * indicator clear chesthundi.
       */
      if (
        previousReceiverId &&
        previousReceiverId !==
        receiverId
      ) {
        io.to(
          previousReceiverId
        ).emit("typing:stop", {
          userId: senderId,
        });
      }

      clearTypingTimer();

      socket.data.typingReceiverId =
        receiverId;

      io.to(receiverId).emit(
        "typing:start",
        {
          userId: senderId,
        }
      );

      /*
       * Old frontend compatibility.
       * New frontend complete ayyaka
       * ee legacy emit remove cheyyachu.
       */
      io.to(receiverId).emit(
        "typing",
        {
          userId: senderId,
        }
      );

      /*
       * Client stop event miss aina
       * automatic fallback.
       */
      socket.data.typingTimer =
        setTimeout(() => {
          stopTypingForReceiver(
            receiverId
          );
        }, TYPING_TIMEOUT_MS);
    };


    /* =========================
       DELIVERED
    ========================= */

    socket.on(
      "messageDelivered",
      async ({ messageId } = {}) => {
        try {
          const currentUserId =
            normalizeId(
              socket.data.userId
            );

          if (
            !messageId ||
            !currentUserId
          ) {
            return;
          }

          const message =
            await Message
              .findOneAndUpdate(
                {
                  _id: messageId,
                  receiver:
                    currentUserId,
                  status: "sent",
                },
                {
                  $set: {
                    status:
                      "delivered",
                  },
                },
                {
                  new: true,
                  runValidators: true,
                }
              );

          if (!message) {
            return;
          }

          const senderId =
            normalizeId(
              message.sender
            );

          io.to(senderId).emit(
            "messageStatusUpdate",
            {
              messageId:
                normalizeId(
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
      async ({ messageId } = {}) => {
        try {
          const currentUserId =
            normalizeId(
              socket.data.userId
            );

          if (
            !messageId ||
            !currentUserId
          ) {
            return;
          }

          const message =
            await Message
              .findOneAndUpdate(
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
            normalizeId(
              message.sender
            );

          io.to(senderId).emit(
            "messageStatusUpdate",
            {
              messageId:
                normalizeId(
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
       TYPING START
    ========================= */

    socket.on(
      "typing:start",
      ({ receiverId } = {}) => {
        startTypingForReceiver(
          receiverId
        );
      }
    );

    /* =========================
       TYPING STOP
    ========================= */

    socket.on(
      "typing:stop",
      ({ receiverId } = {}) => {
        stopTypingForReceiver(
          receiverId
        );
      }
    );

    /*
     * Existing frontend temporary
     * compatibility.
     */
    socket.on(
      "typing",
      ({ receiverId } = {}) => {
        startTypingForReceiver(
          receiverId
        );
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

        const typingReceiverId =
          normalizeId(
            socket.data
              .typingReceiverId
          );

        if (typingReceiverId) {
          stopTypingForReceiver(
            typingReceiverId
          );
        } else {
          clearTypingTimer();
        }

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