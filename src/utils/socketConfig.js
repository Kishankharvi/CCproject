import { io } from "socket.io-client";

export const getSocketConnection = () => {
  const isProduction = import.meta.env.MODE === "production";

  const serverUrl = isProduction
    ? import.meta.env.VITE_SERVER_URL || "https://13.127.253.123:3001"
    : import.meta.env.VITE_SERVER_URL || "http://13.127.253.123:3001";
  console.log("Connecting to Socket.IO server at:", serverUrl);
  return io(serverUrl, {
    transports: ["websocket", "polling"],
    upgrade: true,
    rememberUpgrade: true,
    timeout: 20000, 
    pingTimeout: 60000,
    pingInterval: 25000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    forceNew: false,
    autoConnect: true,
    withCredentials: true,
    extraHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    query: {
      timestamp: Date.now(),
      client: "web-app",
    },
  });
};
