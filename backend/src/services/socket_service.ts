// services/socket_service.ts
import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import redis from "../config/redis";

let io: SocketIOServer;

export function initSocketServer(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket: Socket) => {
    console.log("⚡ Client connected:", socket.id);

    // Agent joins with ID
    socket.on("agent:join", (agentId: string) => {
      console.log(`👨‍💻 Agent joined with ID ${agentId}`);
      socket.join(`agent:${agentId}`);
    });

    // Agent responds to call → forward to backend via Redis
    socket.on("agent:response", (payload: { agentId: string; accepted: boolean; customerId: string }) => {
      console.log(`📩 Response from agent ${payload.agentId}:`, payload);
      redis.publish("agent:responses", JSON.stringify(payload));
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
}

// 👉 Send notification to specific agent
export function notifyAgent(agentId: string, data: any) {
  if (!io) {
    console.error("❌ Socket.io not initialized");
    return;
  }
  io.to(`agent:${agentId}`).emit("agent:notification", data);
}
