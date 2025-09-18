import { Request, Response } from "express";
import { nanoid } from "nanoid";
import dotenv from "dotenv";
import { generateToken } from "../services/livekit_token_service";
import { saveUserSession } from "../services/redis_service";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../utils/commonfunction";
import { assignAgentToCustomer } from "../services/call_router";
import { startRecording } from "../services/recording_service";

dotenv.config();

/**
 * Step 1: Customer requests to join.
 * - Create customerId + roomName
 * - Generate LiveKit token
 * - Save session
 * - Trigger agent assignment
 * (⚠️ No recording here)
 */
export const customer_join = async (req: Request, res: Response) => {
  const customerId = nanoid(10);
  const roomName = customerId; // each customer gets unique room

  try {
    const token = await generateToken(customerId, roomName);

    await saveUserSession(customerId, token, roomName);

    // 🔄 Trigger background task for agent assignment
    assignAgentToCustomer(customerId, roomName);

    return sendSuccessResponse(
      res,
      200,
      { token, roomName, customerId },
      "Token generated successfully"
    );
  } catch (err) {
    console.error("Error generating token:", err);
    return sendErrorResponse(res, 500, "Failed to generate token");
  }
};

/**
 * Step 2: Customer actually joins the room (frontend can call this
 * after joining).
 * - Start LiveKit recording for that room
 */
export const customer_join_room = async (req: Request, res: Response) => {
  const { roomName } = req.body;

  if (!roomName) {
    return sendErrorResponse(res, 400, "roomName is required");
  }

  try {
    const egress_id = await startRecording(roomName);
    return sendSuccessResponse(
      res,
      200,
      { egress_id, roomName },
      "Recording started successfully"
    );
  } catch (err) {
    console.error("Error starting recording:", err);
    return sendErrorResponse(res, 500, "Failed to start recording");
  }
};
