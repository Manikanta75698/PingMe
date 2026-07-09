import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  autoConnect: false,
});

socket.on("connect", () => {
  console.log("GLOBAL CONNECT:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("GLOBAL DISCONNECT:", reason);
});

socket.on("connect_error", (err) => {
  console.log("GLOBAL CONNECT ERROR:", err.message);
});

socket.onAny((event, ...args) => {
  console.log("SOCKET EVENT =>", event, args);
});

export default socket;