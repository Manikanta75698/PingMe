const {
  setIO,
  setSocketId,
  removeSocketId,
  getOnlineUsers,
} = require("./socketInstance");

const socketHandler = (io) => {
  // Socket.IO instance ni message controller kosam store chestundi
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

      // Optional room; future realtime features ki useful
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