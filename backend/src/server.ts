// server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import customerRoute from "./routes/customer_route";
import agentRoute from "./routes/agent_route";
import webhookRoute from "./routes/webhook_route";
import { initResponseListener } from "./services/response_listener";
import { initSocketServer } from "./services/socket_service";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  cors({
    origin: "*", // tighten in production
  })
);

// Routes
app.use("/customer", customerRoute);
app.use("/agent", agentRoute);
app.use("/webhook", webhookRoute);
const server = http.createServer(app);

// Initialize socket server
initSocketServer(server);

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initResponseListener(); // 👈 Start Redis listeners (for agent responses only)
});
