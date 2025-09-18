// services/socketService.ts
import { io, Socket } from "socket.io-client";
import { AgentNotification } from "../types/types";

let socket: Socket;

export function connectAgentSocket(agentId: string, onNotification: (data: AgentNotification) => void) {
  socket = io("http://localhost:3000"); // your backend

  socket.on("connect", () => {
    console.log("✅ Socket.IO connected");
    socket.emit("agent:join", agentId);
  });

  socket.on("agent:notification", (data: AgentNotification) => {
    onNotification(data);
  });

  socket.on("disconnect", () => console.log("❌ Socket.IO disconnected"));

  return socket;
}

export function emitAgentResponse(agentId: string, customerId: string, accepted: boolean) {
  if (!socket) return;
  socket.emit("agent:response", { agentId, customerId, accepted });
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
}
