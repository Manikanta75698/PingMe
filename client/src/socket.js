import { io } from "socket.io-client";

const socket = io(
  "https://pingme-api-new.onrender.com",
  {
    transports: ["websocket"],
    reconnection: true,
  }
);

export default socket;