// controllers/agent_controller.ts
import { Request, Response } from "express";
import { sendSuccessResponse, sendErrorResponse } from "../utils/commonfunction";
import { nanoid } from "nanoid";
import { saveAgentSession ,getUserSession,findNextAvailableAgent,getConversation,removeAgentFromAvailable} from "../services/redis_service";
import { publishNotification } from "../services/notification_service";
import { generateToken } from "../services/livekit_token_service";
import { stopRecording, transcribeAudioChunk } from "../services/recording_service";
import { summarizeConversation } from "../services/summarization_service"; // 🔹 summary service
export const agent_register = async (req: Request, res: Response) => {
  try {
    const agentId = nanoid(10);
    await saveAgentSession(agentId, "online", false, null, null);

    return sendSuccessResponse(res, 200, { agentId }, "Agent joined successfully");
  } catch (err) {
    console.error("Error in agent join:", err);
    return sendErrorResponse(res, 500, "Failed to join as agent");
  }
};

export async function agentAcceptCall(req: Request, res: Response) {
  try {
    const { agentId, customerId } = req.body;

    if (!agentId || !customerId) {
      return sendErrorResponse(res, 400, "agentId and customerId are required");
    }

    // 1️⃣ Get customer session from Redis
    const customerSession = await getUserSession(customerId);
    if (!customerSession) {
      return sendErrorResponse(res, 404, "Customer session not found");
    }

    const { room } = customerSession;

    // 2️⃣ Generate LiveKit token for agent
    const agentToken = await generateToken(agentId, room);

    // 3️⃣ Save agent session in Redis
    await saveAgentSession(agentId, "online", true, customerId, room);

    // 4️⃣ Publish notification to Redis / WebSocket
    await publishNotification("agent:responses", {
      agentId,
      customerId,
      accepted: true,
      room,
    });

    // 5️⃣ Check if conversation already exists for customer + agent
    let summary: string | null = null;
    const conversationText = await getConversation(customerId, agentId);
    if (conversationText && conversationText.trim().length > 0) {
      try {
        summary = await summarizeConversation(conversationText);
      } catch (err) {
        console.error("Summarization failed:", err);
      }
    }

    // 6️⃣ Return token + room info + optional summary
    return sendSuccessResponse(
      res,
      200,
      {
        agentId,
        customerId,
        token: agentToken,
        room,
        summary, // ⬅ included only if available
      },
      "Agent accepted call"
    );
  } catch (err) {
    console.error("Error in agentAcceptCall:", err);
    return sendErrorResponse(res, 500, "Failed to accept call");
  }
}



export async function agentRejectCall(req: Request, res: Response) {
  try {
    const { agentId, customerId } = req.body;

    if (!agentId || !customerId) {
      return sendErrorResponse(res, 400, "agentId and customerId are required");
    }

    // Publish rejection to Redis / WebSocket
    await publishNotification("agent:responses", {
      agentId,
      customerId,
      accepted: false,
    });

    return sendSuccessResponse(
      res,
      200,
      { agentId, customerId },
      "Agent rejected call"
    );
  } catch (err) {
    console.error("Error in agentRejectCall:", err);
    return sendErrorResponse(res, 500, "Failed to reject call");
  }
}



export async function agent_statusUpdate(req: Request, res: Response) {
  try {
    const { agentId } = req.body;

    await publishNotification("agent:joins", { agentId, status: "online" });

    return sendSuccessResponse(res, 200, { agentId }, "Agent is now online");
  } catch (err) {
    console.error("Error in agentJoin:", err);
    return sendErrorResponse(res, 500, "Failed to set agent online");
  }
}



export async function agent_transfer_call(req: Request, res: Response) {
  try {
    const { agentId, customerId } = req.body;

    if (!agentId || !customerId) {
      return sendErrorResponse(res, 400, "agentId and customerId are required");
    }

    // 1️⃣ Find next available agent
    const nextAgentId = await findNextAvailableAgent();
    if (!nextAgentId) {
      return sendErrorResponse(res, 404, "No available agent to transfer call");
    }

    // 2️⃣ Stop current recording and get local file path
    const roomId = `${customerId}-${agentId}`; // assuming roomId is combination of customer & agent
    const recordingPath = await stopRecording(roomId);

    // 3️⃣ Transcribe final chunk and save conversation
    await transcribeAudioChunk(recordingPath, customerId, agentId);

    // 4️⃣ Fetch entire conversation so new agent can see history
    const conversationHistory = await getConversation(customerId, agentId);

    // 5️⃣ Remove new agent from available list and mark on_call
    await saveAgentSession(nextAgentId, "online", true, customerId, roomId);

    // 6️⃣ Generate LiveKit token for new agent
    const token = await generateToken(nextAgentId, roomId);

    // 7️⃣ Publish notifications
    await publishNotification("agent:responses", {
      agentId: nextAgentId,
      customerId,
      accepted: true,
      room: roomId,
      conversation: conversationHistory,
      transferredFrom: agentId,
    });

    // Optional: notify old agent that transfer is successful
    await publishNotification("agent:responses", {
      agentId,
      customerId,
      transferredTo: nextAgentId,
      message: "Call transferred successfully",
    });

    return sendSuccessResponse(
      res,
      200,
      {
        agentId: nextAgentId,
        customerId,
        token,
        room: roomId,
      },
      "Call transferred successfully"
    );
  } catch (err) {
    console.error("Error in agentTransferCall:", err);
    return sendErrorResponse(res, 500, "Failed to transfer call");
  }
}
