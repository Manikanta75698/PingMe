import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://pingme-m8y1.onrender.com";

const socket = io(SOCKET_URL, {
  autoConnect: false,

  // Socket.IO automatic ga polling -> websocket upgrade handle chestundi
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

socket.on("connect", () => {
  console.log("GLOBAL SOCKET CONNECTED:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("GLOBAL SOCKET DISCONNECTED:", reason);
});

socket.on("connect_error", (error) => {
  console.error(
    "GLOBAL SOCKET CONNECTION ERROR:",
    error.message
  );
});

socket.io.on("reconnect", (attemptNumber) => {
  console.log(
    "GLOBAL SOCKET RECONNECTED:",
    attemptNumber,
    socket.id
  );
});

export default socket;