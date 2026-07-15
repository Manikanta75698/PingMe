const {
  setIO,
  setSocketId,
  removeSocketId,
  getOnlineUsers,
  isUserOnline,
} = require("./socketInstance");

const {
  authenticateSocket,
} = require("../middleware/authMiddleware");

const Message = require("../models/Message");

const User = require("../models/User");

const TYPING_TIMEOUT_MS = 2500;

const PRESENCE_OFFLINE_DELAY_MS = 3000;

const offlineTimers =
  new Map();

const normalizeId = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value).trim();
  }

  /*
   * Mongoose ObjectId compatible,
   * mongoose import avasaram ledu.
   */
  if (
    typeof value?.toHexString ===
    "function"
  ) {
    try {
      return String(
        value.toHexString()
      ).trim();
    } catch {
      return "";
    }
  }

  if (typeof value === "object") {
    if (
      value._id &&
      value._id !== value
    ) {
      return normalizeId(
        value._id
      );
    }

    if (
      value.userId &&
      value.userId !== value
    ) {
      return normalizeId(
        value.userId
      );
    }

    if (
      Object.prototype
        .hasOwnProperty.call(
          value,
          "id"
        )
    ) {
      const ownId = value.id;

      if (
        ownId &&
        ownId !== value
      ) {
        return normalizeId(
          ownId
        );
      }
    }

    return "";
  }

  const stringValue =
    String(value).trim();

  return stringValue ===
    "[object Object]"
    ? ""
    : stringValue;
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

    /*
 * Pending offline timer unte
 * reconnect ayyaka cancel chesthundi.
 */
    const pendingOfflineTimer =
      offlineTimers.get(
        authenticatedUserId
      );

    if (pendingOfflineTimer) {
      clearTimeout(
        pendingOfflineTimer
      );

      offlineTimers.delete(
        authenticatedUserId
      );
    }

    User.findByIdAndUpdate(
      authenticatedUserId,
      {
        $set: {
          isOnline: true,
        },
      },
      {
        runValidators: true,
      }
    ).catch((error) => {
      console.error(
        "USER ONLINE STATUS UPDATE ERROR:",
        error
      );
    });

    io.emit(
      "userPresenceChanged",
      {
        userId:
          authenticatedUserId,

        isOnline:
          true,

        lastSeen:
          null,
      }
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

        const removalResult =
          removeSocketId(
            socket.id
          );

        const disconnectedUserId =
          normalizeId(
            removalResult?.userId ||
            socket.data?.userId
          );

        io.emit(
          "onlineUsers",
          getOnlineUsers()
        );

        /*
         * Same user ki vere tab/device socket
         * active unte Offline mark cheyyakudadhu.
         */
        if (
          !disconnectedUserId ||
          removalResult?.isOnline
        ) {
          return;
        }

        /*
         * Temporary network disconnect/reconnect
         * valla status flicker raakunda grace time.
         */
        const existingTimer =
          offlineTimers.get(
            disconnectedUserId
          );

        if (existingTimer) {
          clearTimeout(
            existingTimer
          );
        }

        const offlineTimer =
          setTimeout(async () => {
            offlineTimers.delete(
              disconnectedUserId
            );

            /*
             * Grace period lopala reconnect
             * ayithe Offline update cancel.
             */
            if (
              isUserOnline(
                disconnectedUserId
              )
            ) {
              return;
            }

            try {
              const lastSeen =
                new Date();

              await User.findByIdAndUpdate(
                disconnectedUserId,
                {
                  $set: {
                    isOnline: false,
                    lastSeen,
                  },
                },
                {
                  runValidators: true,
                }
              );

              io.emit(
                "userPresenceChanged",
                {
                  userId:
                    disconnectedUserId,

                  isOnline:
                    false,

                  lastSeen:
                    lastSeen.toISOString(),
                }
              );

              io.emit(
                "onlineUsers",
                getOnlineUsers()
              );

              console.log(
                "USER MARKED OFFLINE:",
                disconnectedUserId,
                lastSeen.toISOString()
              );
            } catch (error) {
              console.error(
                "USER OFFLINE STATUS UPDATE ERROR:",
                error
              );
            }
          }, PRESENCE_OFFLINE_DELAY_MS);

        offlineTimers.set(
          disconnectedUserId,
          offlineTimer
        );
      }
    );
  });
};

module.exports = socketHandler;