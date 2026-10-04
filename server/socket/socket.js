const {
  setIO,
  setSocketId,
  removeSocketId,
  isUserOnline,
} = require("./socketInstance");

const { authenticateSocket } = require("../middleware/authMiddleware");

const Message = require("../models/Message");
const User = require("../models/User");

const TYPING_TIMEOUT_MS = 2500;
const PRESENCE_OFFLINE_DELAY_MS = 3000;

const offlineTimers = new Map();

const normalizeId = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (typeof value?.toHexString === "function") {
    try {
      return String(value.toHexString()).trim();
    } catch {
      return "";
    }
  }

  if (typeof value === "object") {
    if (value._id && value._id !== value) {
      return normalizeId(value._id);
    }

    if (value.userId && value.userId !== value) {
      return normalizeId(value.userId);
    }

    if (Object.prototype.hasOwnProperty.call(value, "id")) {
      const ownId = value.id;
      if (ownId && ownId !== value) {
        return normalizeId(ownId);
      }
    }

    return "";
  }

  const stringValue = String(value).trim();
  return stringValue === "[object Object]" ? "" : stringValue;
};

const socketHandler = (io) => {
  setIO(io);

  io.use(authenticateSocket);

  io.on("connection", async (socket) => {
    const authenticatedUserId = normalizeId(
      socket.data?.userId || socket.userId || socket.user?._id
    );

    if (!authenticatedUserId) {
      console.error(
        "SOCKET CONNECTION REJECTED: Authenticated user ID missing",
        socket.id
      );
      socket.disconnect(true);
      return;
    }

    socket.data.userId = authenticatedUserId;
    socket.data.typingReceiverId = "";
    socket.data.typingTimer = null;

    setSocketId(authenticatedUserId, socket.id);
    socket.join(authenticatedUserId);

    // Cancel pending offline timer if reconnecting inside grace period
    const pendingOfflineTimer = offlineTimers.get(authenticatedUserId);
    if (pendingOfflineTimer) {
      clearTimeout(pendingOfflineTimer);
      offlineTimers.delete(authenticatedUserId);
    }

    try {
      const connectedUser = await User.findByIdAndUpdate(
        authenticatedUserId,
        {
          $set: {
            isOnline: true,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .select(
          [
            "privacySettings.showOnlineStatus",
            "privacySettings.showLastSeen",
          ].join(" ")
        )
        .lean();

      const showOnlineStatus =
        connectedUser?.privacySettings?.showOnlineStatus !== false;

      if (showOnlineStatus) {
        io.emit("userPresenceChanged", {
          userId: authenticatedUserId,
          isOnline: true,
          lastSeen: null,
        });
      }

      /* ==========================================================
         AUTO-DELIVER PENDING MESSAGES ON CONNECT
         User online ravagane vaallaki pending unna sent messages ni
         delivered ga marchi senders ki notify chesthundhi.
      ========================================================== */
      const undeliveredMessages = await Message.find({
        receiver: authenticatedUserId,
        status: "sent",
        deletedForEveryone: false,
      }).select("_id sender");

      if (undeliveredMessages.length > 0) {
        const now = new Date();
        const undeliveredIds = undeliveredMessages.map((m) => m._id);

        await Message.updateMany(
          { _id: { $in: undeliveredIds } },
          {
            $set: {
              status: "delivered",
              deliveredAt: now,
            },
          }
        );

        // Group notifications by sender so we don't spam duplicate events
        const senderMessageMap = new Map();
        undeliveredMessages.forEach((msg) => {
          const sId = normalizeId(msg.sender);
          if (!senderMessageMap.has(sId)) {
            senderMessageMap.set(sId, []);
          }
          senderMessageMap.get(sId).push(normalizeId(msg._id));
        });

        senderMessageMap.forEach((msgIds, sId) => {
          io.to(sId).emit("messagesDelivered", {
            messageIds: msgIds,
            receiverId: authenticatedUserId,
            status: "delivered",
            deliveredAt: now,
          });
        });
      }
    } catch (error) {
      console.error("USER ONLINE STATUS OR DELIVERY SYNC ERROR:", error);
    }

    /* =========================
       TYPING HELPERS
    ========================= */
    const clearTypingTimer = () => {
      if (!socket.data.typingTimer) {
        return;
      }
      clearTimeout(socket.data.typingTimer);
      socket.data.typingTimer = null;
    };

    const stopTypingForReceiver = (receiverIdValue) => {
      const senderId = normalizeId(socket.data.userId);
      const receiverId = normalizeId(
        receiverIdValue || socket.data.typingReceiverId
      );

      clearTypingTimer();

      if (socket.data.typingReceiverId === receiverId) {
        socket.data.typingReceiverId = "";
      }

      if (!senderId || !receiverId || senderId === receiverId) {
        return;
      }

      io.to(receiverId).emit("typing:stop", {
        userId: senderId,
      });
    };

    const startTypingForReceiver = (receiverIdValue) => {
      const senderId = normalizeId(socket.data.userId);
      const receiverId = normalizeId(receiverIdValue);

      if (!senderId || !receiverId || senderId === receiverId) {
        return;
      }

      const previousReceiverId = normalizeId(socket.data.typingReceiverId);

      if (previousReceiverId && previousReceiverId !== receiverId) {
        io.to(previousReceiverId).emit("typing:stop", {
          userId: senderId,
        });
      }

      clearTypingTimer();

      socket.data.typingReceiverId = receiverId;

      io.to(receiverId).emit("typing:start", {
        userId: senderId,
      });

      // Legacy support
      io.to(receiverId).emit("typing", {
        userId: senderId,
      });

      socket.data.typingTimer = setTimeout(() => {
        stopTypingForReceiver(receiverId);
      }, TYPING_TIMEOUT_MS);
    };

    /* =========================
       SINGLE MESSAGE DELIVERED
    ========================= */
    socket.on("messageDelivered", async ({ messageId } = {}) => {
      try {
        const currentUserId = normalizeId(socket.data.userId);
        if (!messageId || !currentUserId) return;

        const now = new Date();
        const message = await Message.findOneAndUpdate(
          {
            _id: messageId,
            receiver: currentUserId,
            status: "sent",
          },
          {
            $set: {
              status: "delivered",
              deliveredAt: now,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

        if (!message) return;

        const senderId = normalizeId(message.sender);
        io.to(senderId).emit("messageStatusUpdate", {
          messageId: normalizeId(message._id),
          senderId,
          receiverId: currentUserId,
          status: "delivered",
          deliveredAt: now,
        });
      } catch (error) {
        console.error("MESSAGE DELIVERED ERROR:", error);
      }
    });

    /* =========================
       SINGLE MESSAGE READ
    ========================= */
    socket.on("messageRead", async ({ messageId } = {}) => {
      try {
        const currentUserId = normalizeId(socket.data.userId);
        if (!messageId || !currentUserId) return;

        const currentUser = await User.findById(currentUserId)
          .select("privacySettings.readReceipts")
          .lean();

        const readReceiptsEnabled =
          currentUser?.privacySettings?.readReceipts !== false;

        if (!readReceiptsEnabled) return;

        const now = new Date();
        const message = await Message.findOneAndUpdate(
          {
            _id: messageId,
            receiver: currentUserId,
            status: { $ne: "read" },
          },
          {
            $set: {
              status: "read",
              readAt: now,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

        if (!message) return;

        const senderId = normalizeId(message.sender);
        io.to(senderId).emit("messageStatusUpdate", {
          messageId: normalizeId(message._id),
          senderId,
          receiverId: currentUserId,
          status: "read",
          readAt: now,
        });
      } catch (error) {
        console.error("MESSAGE READ ERROR:", error);
      }
    });

    /* ==========================================================
       CONVERSATION / CHAT OPENED (BULK MARK AS READ)
       Receiver oka chat open chesinappudu aa user nunchi vachina
       messages anni okesari 'read' cheyataniki.
    ========================================================== */
    socket.on("chat:read", async ({ senderId: chatPartnerId } = {}) => {
      try {
        const currentUserId = normalizeId(socket.data.userId);
        const partnerId = normalizeId(chatPartnerId);

        if (!currentUserId || !partnerId) return;

        const currentUser = await User.findById(currentUserId)
          .select("privacySettings.readReceipts")
          .lean();

        if (currentUser?.privacySettings?.readReceipts === false) return;

        const now = new Date();

        const unreadMessages = await Message.find({
          sender: partnerId,
          receiver: currentUserId,
          status: { $in: ["sent", "delivered"] },
          deletedForEveryone: false,
        }).select("_id").lean();

        const messageIds = unreadMessages.map((message) => message._id);
        const updateResult = messageIds.length
          ? await Message.updateMany(
            { _id: { $in: messageIds } },
            { $set: { status: "read", readAt: now } }
          )
          : { modifiedCount: 0 };

        if (updateResult.modifiedCount > 0) {
          io.to(partnerId).emit("conversationRead", {
            readBy: currentUserId,
            readAt: now,
            messageIds: messageIds.map(normalizeId),
          });
        }
      } catch (error) {
        console.error("CHAT READ BULK ERROR:", error);
      }
    });

    /* =========================
       PRESENCE SYNC
    ========================= */
    socket.on("presence:sync", async ({ userId } = {}) => {
      try {
        const targetUserId = normalizeId(userId);

        if (!targetUserId) {
          return socket.emit("presence:snapshot", {
            userId: "",
            isOnline: false,
            lastSeen: null,
          });
        }

        const targetUser = await User.findById(targetUserId)
          .select(
            [
              "lastSeen",
              "privacySettings.showOnlineStatus",
              "privacySettings.showLastSeen",
            ].join(" ")
          )
          .lean();

        if (!targetUser) {
          return socket.emit("presence:snapshot", {
            userId: targetUserId,
            isOnline: false,
            lastSeen: null,
          });
        }

        const showOnlineStatus =
          targetUser?.privacySettings?.showOnlineStatus !== false;

        const showLastSeen =
          targetUser?.privacySettings?.showLastSeen !== false;

        const actualOnline = isUserOnline(targetUserId);

        return socket.emit("presence:snapshot", {
          userId: targetUserId,
          isOnline: showOnlineStatus ? actualOnline : false,
          lastSeen:
            showLastSeen && !actualOnline && targetUser.lastSeen
              ? new Date(targetUser.lastSeen).toISOString()
              : null,
        });
      } catch (error) {
        console.error("PRESENCE SYNC ERROR:", error);
        socket.emit("presence:snapshot", {
          userId: normalizeId(userId),
          isOnline: false,
          lastSeen: null,
        });
      }
    });

    /* =========================
       TYPING LISTENERS
    ========================= */
    socket.on("typing:start", ({ receiverId } = {}) => {
      startTypingForReceiver(receiverId);
    });

    socket.on("typing:stop", ({ receiverId } = {}) => {
      stopTypingForReceiver(receiverId);
    });

    socket.on("typing", ({ receiverId } = {}) => {
      startTypingForReceiver(receiverId);
    });

    /* =========================
       DISCONNECT
    ========================= */
    socket.on("disconnect", () => {
      console.log("SOCKET DISCONNECTED:", socket.id);

      const typingReceiverId = normalizeId(socket.data?.typingReceiverId);
      if (typingReceiverId) {
        stopTypingForReceiver(typingReceiverId);
      } else {
        clearTypingTimer();
      }

      const removalResult = removeSocketId(socket.id);
      const disconnectedUserId = normalizeId(
        removalResult?.userId || socket.data?.userId
      );

      if (!disconnectedUserId || removalResult?.isOnline) {
        return;
      }

      const existingTimer = offlineTimers.get(disconnectedUserId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const offlineTimer = setTimeout(async () => {
        offlineTimers.delete(disconnectedUserId);

        if (isUserOnline(disconnectedUserId)) {
          return;
        }

        try {
          const lastSeen = new Date();
          const disconnectedUser = await User.findByIdAndUpdate(
            disconnectedUserId,
            {
              $set: {
                isOnline: false,
                lastSeen,
              },
            },
            {
              new: true,
              runValidators: true,
            }
          )
            .select(
              [
                "privacySettings.showOnlineStatus",
                "privacySettings.showLastSeen",
              ].join(" ")
            )
            .lean();

          const showOnlineStatus =
            disconnectedUser?.privacySettings?.showOnlineStatus !== false;

          const showLastSeen =
            disconnectedUser?.privacySettings?.showLastSeen !== false;

          if (showOnlineStatus || showLastSeen) {
            io.emit("userPresenceChanged", {
              userId: disconnectedUserId,
              isOnline: false,
              lastSeen: showLastSeen ? lastSeen.toISOString() : null,
            });
          }

          console.log(
            "USER MARKED OFFLINE:",
            disconnectedUserId,
            lastSeen.toISOString()
          );
        } catch (error) {
          console.error("USER OFFLINE STATUS UPDATE ERROR:", error);
        }
      }, PRESENCE_OFFLINE_DELAY_MS);

      offlineTimers.set(disconnectedUserId, offlineTimer);
    });
  });
};

module.exports = socketHandler;