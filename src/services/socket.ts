import { io } from "socket.io-client";

export const socket = io("https://herosurvivor-server.onrender.com", {
  transports: ["websocket"],
});