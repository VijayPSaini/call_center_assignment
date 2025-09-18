import { 
  findNextAvailableAgent,
  updateAgentStatus,
  removeAgentFromAvailable,
  pushAgentToQueueEnd
} from "./redis_service";
 import {notifyAgent} from "./socket_service";
import { publishNotification } from "./notification_service";
import { waitForAgentResponse } from "./response_listener";

export async function assignAgentToCustomer(customerId: string, roomName: string) {
  let assigned = false;

  while (!assigned) {
    const agentId = await findNextAvailableAgent();
    if (!agentId) {
      console.log("❌ No agents available currently.");
      break;
    }

    console.log(`🔔 Trying agent ${agentId} for customer ${customerId}`);

    // await publishNotification("agent:notifications", { agentId, customerId, roomName });
     notifyAgent(agentId, { customerId, roomName });

    const accepted = await waitForAgentResponse(agentId, 30000);
    if (accepted) {
      console.log(`✅ Agent ${agentId} accepted call for ${customerId}`);

      await updateAgentStatus(agentId, {
        on_call: "true",
        on_call_with: customerId,
        room: roomName,
      });
      await removeAgentFromAvailable(agentId);

      assigned = true;
      break;
    } else {
      console.log(`⚠️ Agent ${agentId} did not respond, moving to next...`);
      await pushAgentToQueueEnd(agentId);
    }
  }
}
