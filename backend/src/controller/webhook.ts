import { Request, Response } from "express";
import crypto from "crypto";
import { startRecording, stopRecording } from "../services/recording_service";
import { getEgressId } from "../services/redis_service";

const LIVEKIT_SECRET = process.env.LIVEKIT_SECRET || "";

/**
 * Verify webhook signature
 */
function verifySignature(req: Request): boolean {
  const signature = req.headers["authorization"] as string;
  if (!signature) return false;

  const bodyString = JSON.stringify(req.body);
  const computed = crypto
    .createHmac("sha256", LIVEKIT_SECRET)
    .update(bodyString)
    .digest("hex");

  return signature === computed;
}

/**
 * Handle incoming LiveKit webhook events
 */
export const handleLivekitWebhook = async (req: Request, res: Response) => {
  if (!verifySignature(req)) {
    console.warn("⚠️ Invalid webhook signature");
    return res.sendStatus(401);
  }

  const event = req.body.event;
  console.log("📩 LiveKit Event:", event);

  try {
    switch (event) {
      // Room lifecycle
      case "room_started":
        console.log(`Room started: ${req.body.room?.name}`);
        break;

      case "room_finished":
        const roomId = req.body.room?.name;
        console.log(`Room finished: ${roomId}`);

        if (roomId) {
          // Get egressId from Redis
          const egressId = await getEgressId(roomId);
          if (egressId) {
            console.log(`Stopping recording for room ${roomId} with egressId ${egressId}`);
            await stopRecording(roomId); // This will also fetch and download the file
          } else {
            console.warn(`No egressId found for room ${roomId}`);
          }
        }
        break;

      // Participant lifecycle
      case "participant_joined":
        console.log(`Participant joined: ${req.body.participant?.identity}`);
        break;

      case "participant_left":
        console.log(`Participant left: ${req.body.participant?.identity}`);
        break;

      // Track events
      case "track_published":
        console.log(`Track published: ${req.body.participant?.identity}`);
        break;

      case "track_unpublished":
        console.log(`Track unpublished: ${req.body.participant?.identity}`);
        break;

      // Recording (egress) events
      case "egress_started":
        console.log(`Recording started: ${req.body.egress_id}`);
        break;

      case "egress_ended":
        console.log(`Recording ended: ${req.body.egress_id}`);
        break;

      default:
        console.log("Unhandled event:", req.body);
    }
  } catch (err) {
    console.error("Webhook error:", err);
  }

  res.sendStatus(200);
};
