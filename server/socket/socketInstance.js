let ioInstance = null;

// userId -> socketId
const userSocketMap = new Map();

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error(
      "Socket.IO has not been initialized"
    );
  }

  return ioInstance;
};

const setSocketId = (userId, socketId) => {
  if (!userId || !socketId) {
    console.error(
      "Unable to store socket: userId or socketId missing"
    );
    return;
  }

  const normalizedUserId = String(userId);

  userSocketMap.set(
    normalizedUserId,
    socketId
  );

  console.log(
    "SOCKET USER ADDED:",
    normalizedUserId,
    socketId
  );
};

// Alias support
const addUser = setSocketId;

const getSocketId = (userId) => {
  if (!userId) {
    return null;
  }

  const normalizedUserId = String(userId);

  return (
    userSocketMap.get(normalizedUserId) ||
    null
  );
};

const removeSocketId = (userIdOrSocketId) => {
  if (!userIdOrSocketId) {
    return;
  }

  const normalizedValue =
    String(userIdOrSocketId);

  // userId directly passed ayithe
  if (userSocketMap.has(normalizedValue)) {
    userSocketMap.delete(normalizedValue);

    console.log(
      "SOCKET USER REMOVED:",
      normalizedValue
    );

    return;
  }

  // socketId passed ayithe matching user remove
  for (const [userId, socketId] of userSocketMap.entries()) {
    if (String(socketId) === normalizedValue) {
      userSocketMap.delete(userId);

      console.log(
        "SOCKET USER REMOVED:",
        userId
      );

      break;
    }
  }
};

// Alias support
const removeUser = removeSocketId;

const getOnlineUsers = () => {
  return Array.from(userSocketMap.keys());
};

module.exports = {
  setIO,
  getIO,

  setSocketId,
  addUser,

  getSocketId,

  removeSocketId,
  removeUser,

  getOnlineUsers,
};