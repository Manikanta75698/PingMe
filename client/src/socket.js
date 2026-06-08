import { io } from "socket.io-client";

const socket = io("https://pingme-api-u477.onrender.com");

export default socket;