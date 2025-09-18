// services/response_listener.ts
import redis from "../config/redis";

const sub = redis.duplicate();

type AgentResponse = {
  agentId: string;
  customerId?: string;
  accepted?: boolean;
};

const agentResponseCallbacks: Map<string, (resp: AgentResponse) => void> = new Map();

export async function initResponseListener() {
  await sub.subscribe("agent:responses");
  await sub.subscribe("agent:joins");

  sub.on("message", (channel, message) => {
    if (channel === "agent:responses") {
      const data: AgentResponse = JSON.parse(message);
      console.log(`📩 Agent response:`, data);

      const cb = agentResponseCallbacks.get(data.agentId);
      if (cb) {
        cb(data);
        agentResponseCallbacks.delete(data.agentId);
      }
    }

    if (channel === "agent:joins") {
      const data = JSON.parse(message);
      console.log(`👨‍💻 Agent joined:`, data);
      // Could auto-add to agents:available here if needed
    }
  });
}

export function waitForAgentResponse(agentId: string, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
      agentResponseCallbacks.delete(agentId);
    }, timeout);

    agentResponseCallbacks.set(agentId, (resp) => {
      clearTimeout(timer);
      resolve(resp.accepted === true);
    });
  });
}
