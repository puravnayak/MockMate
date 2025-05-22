import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  transports: ["websocket"], 
  reconnectionAttempts: 5,   
  timeout: 10000,            
});

export default socket;
