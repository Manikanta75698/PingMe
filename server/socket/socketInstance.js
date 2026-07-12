let ioInstance = null;

// userId -> Set of socketIds
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
  const normalizedSocketId = String(socketId);

  const sockets =
    userSocketMap.get(normalizedUserId) ||
    new Set();

  sockets.add(normalizedSocketId);

  userSocketMap.set(
    normalizedUserId,
    sockets
  );

  console.log(
    "SOCKET USER ADDED:",
    normalizedUserId,
    normalizedSocketId
  );
};

const addUser = setSocketId;

const getSocketId = (userId) => {
  if (!userId) return null;

  const sockets = userSocketMap.get(
    String(userId)
  );

  if (!sockets || sockets.size === 0) {
    return null;
  }

  return Array.from(sockets)[0];
};

const getSocketIds = (userId) => {
  if (!userId) return [];

  const sockets = userSocketMap.get(
    String(userId)
  );

  return sockets
    ? Array.from(sockets)
    : [];
};

const removeSocketId = (userIdOrSocketId) => {
  if (!userIdOrSocketId) return;

  const normalizedValue = String(
    userIdOrSocketId
  );

  if (userSocketMap.has(normalizedValue)) {
    userSocketMap.delete(normalizedValue);

    console.log(
      "SOCKET USER REMOVED:",
      normalizedValue
    );

    return;
  }

  for (const [
    userId,
    socketIds,
  ] of userSocketMap.entries()) {
    socketIds.delete(normalizedValue);

    if (socketIds.size === 0) {
      userSocketMap.delete(userId);

      console.log(
        "SOCKET USER OFFLINE:",
        userId
      );
    }
  }
};

const removeUser = removeSocketId;

const getOnlineUsers = () => {
  return Array.from(
    userSocketMap.entries()
  )
    .filter(
      ([, socketIds]) =>
        socketIds.size > 0
    )
    .map(([userId]) => userId);
};

module.exports = {
  setIO,
  getIO,

  setSocketId,
  addUser,

  getSocketId,
  getSocketIds,

  removeSocketId,
  removeUser,

  getOnlineUsers,
};