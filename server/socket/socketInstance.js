let io;

const onlineUsers = new Map();

const setIO = (socketIO) => {
  io = socketIO;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};

const setSocketId = (userId, socketId) => {
  if (!userId) return;   // 🔥 IMPORTANT FIX

  onlineUsers.set(userId.toString(), socketId);
};

const getSocketId = (userId) => {
  if (!userId) return null;   // 🔥 IMPORTANT FIX

  return onlineUsers.get(userId.toString());
};

const removeSocketId = (userId) => {
  onlineUsers.delete(userId.toString());
};

module.exports = {
  setIO,
  getIO,
  setSocketId,
  getSocketId,
  removeSocketId,
};