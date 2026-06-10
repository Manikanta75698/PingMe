import { io } from "socket.io-client";

const socket = io(
  "https://pingme-api-u477.onrender.com",
  {
    transports: ["websocket"],
    reconnection: true,
  }
);

export default socket;