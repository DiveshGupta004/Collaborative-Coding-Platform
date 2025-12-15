import { io } from "socket.io-client";

// Backend URL
const SOCKET_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : window.location.origin;

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

// Optional helpers
export const connectSocket = (token) => {
  if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
