// controllers/agent_controller.ts
import { BASE_URL } from "../config";
import { emitAgentResponse } from "../model/socket_service";
import { AgentNotification } from "../types/types";

export async function respondToCall(agentId: string, notification: AgentNotification, accepted: boolean) {
  try {
    const endpoint = accepted ? "accept-call" : "reject-call";
    const res = await fetch(`${BASE_URL}/agent/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, customerId: notification.customerId }),
    });
  console.log('response from backend after call agent react',res);
  
    if (res.ok) {
      // Notify via socket
      emitAgentResponse(agentId, notification.customerId, accepted);
      const data = await res.json();
      console.log('response data from backend after call agent react',data);
      
      return data; // return response data from backend (token, roomName, etc.)
    }

    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
}
