import { AccessToken } from "livekit-server-sdk";
import dotenv from "dotenv";
dotenv.config();
/**
 * Generate a LiveKit access token for a participant
 * @param identity Unique identity for the participant (e.g., caller1, agentA)
 * @param roomName Name of the room to join
 */
export async function generateToken(identity: string, roomName: string): Promise<string> {
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    throw new Error("Missing LiveKit API credentials in environment variables");
  }

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_SECRET,
    { identity }
  );

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt(); // ✅ now we await the promise
  if (!token) {
    throw new Error("Failed to generate LiveKit token");
  }

  return token;
}
