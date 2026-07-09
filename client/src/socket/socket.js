import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://pingme-m8y1.onrender.com";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("GLOBAL CONNECT:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("GLOBAL DISCONNECT:", reason);
});

socket.on("connect_error", (err) => {
  console.error("CONNECT ERROR:", err.message);
});

export default socket;