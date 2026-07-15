let ioInstance = null;

/*
 * userId -> Set<socketId>
 *
 * Oka user multiple browser tabs/devices
 * nunchi connect avvachu.
 */
const userSocketMap =
  new Map();

/* =========================
   IO INSTANCE
========================= */

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

/* =========================
   ADD SOCKET
========================= */

const setSocketId = (
  userId,
  socketId
) => {
  if (!userId || !socketId) {
    console.error(
      "Unable to store socket: userId or socketId missing"
    );

    return false;
  }

  const normalizedUserId =
    String(userId).trim();

  const normalizedSocketId =
    String(socketId).trim();

  if (
    !normalizedUserId ||
    !normalizedSocketId
  ) {
    return false;
  }

  const socketIds =
    userSocketMap.get(
      normalizedUserId
    ) || new Set();

  socketIds.add(
    normalizedSocketId
  );

  userSocketMap.set(
    normalizedUserId,
    socketIds
  );

  console.log(
    "SOCKET USER ADDED:",
    normalizedUserId,
    normalizedSocketId,
    `(${socketIds.size} active)`
  );

  return true;
};

const addUser = setSocketId;

/* =========================
   READ SOCKETS
========================= */

const getSocketId = (
  userId
) => {
  if (!userId) {
    return null;
  }

  const socketIds =
    userSocketMap.get(
      String(userId).trim()
    );

  if (
    !socketIds ||
    socketIds.size === 0
  ) {
    return null;
  }

  return Array.from(
    socketIds
  )[0];
};

const getSocketIds = (
  userId
) => {
  if (!userId) {
    return [];
  }

  const socketIds =
    userSocketMap.get(
      String(userId).trim()
    );

  return socketIds
    ? Array.from(socketIds)
    : [];
};

const isUserOnline = (
  userId
) => {
  if (!userId) {
    return false;
  }

  const socketIds =
    userSocketMap.get(
      String(userId).trim()
    );

  return Boolean(
    socketIds &&
    socketIds.size > 0
  );
};

/* =========================
   REMOVE SOCKET
========================= */

const removeSocketId = (
  userIdOrSocketId
) => {
  if (!userIdOrSocketId) {
    return {
      userId: "",
      isOnline: false,
      remainingSocketCount: 0,
    };
  }

  const normalizedValue =
    String(
      userIdOrSocketId
    ).trim();

  /*
   * Direct userId remove request.
   * Ee case lo aa user sockets anni remove.
   */
  if (
    userSocketMap.has(
      normalizedValue
    )
  ) {
    userSocketMap.delete(
      normalizedValue
    );

    console.log(
      "SOCKET USER REMOVED:",
      normalizedValue
    );

    return {
      userId:
        normalizedValue,

      isOnline:
        false,

      remainingSocketCount:
        0,
    };
  }

  /*
   * socketId search chesi
   * exact socket matrame remove.
   */
  for (const [
    userId,
    socketIds,
  ] of userSocketMap.entries()) {
    if (
      !socketIds.has(
        normalizedValue
      )
    ) {
      continue;
    }

    socketIds.delete(
      normalizedValue
    );

    const remainingSocketCount =
      socketIds.size;

    const stillOnline =
      remainingSocketCount > 0;

    if (!stillOnline) {
      userSocketMap.delete(
        userId
      );

      console.log(
        "SOCKET USER OFFLINE:",
        userId
      );
    } else {
      userSocketMap.set(
        userId,
        socketIds
      );

      console.log(
        "SOCKET USER CONNECTION REMOVED:",
        userId,
        normalizedValue,
        `(${remainingSocketCount} active)`
      );
    }

    return {
      userId,

      isOnline:
        stillOnline,

      remainingSocketCount,
    };
  }

  return {
    userId: "",
    isOnline: false,
    remainingSocketCount: 0,
  };
};

const removeUser =
  removeSocketId;

/* =========================
   ONLINE USERS
========================= */

const getOnlineUsers = () => {
  return Array.from(
    userSocketMap.entries()
  )
    .filter(
      ([, socketIds]) =>
        socketIds.size > 0
    )
    .map(
      ([userId]) =>
        userId
    );
};

module.exports = {
  setIO,
  getIO,

  setSocketId,
  addUser,

  getSocketId,
  getSocketIds,
  isUserOnline,

  removeSocketId,
  removeUser,

  getOnlineUsers,
};