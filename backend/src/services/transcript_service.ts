import fs from "fs";
// import fetch from "node-fetch";
import { saveConversationSegment } from "./redis_service";

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY!;
const AZURE_REGION = process.env.AZURE_REGION!;
const AZURE_ENDPOINT = `https://${AZURE_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`;

/**
 * Convert audio file to text using Azure Speech API
 * Save in Redis by userId and agentId
 */
export async function transcribeAudio(
  audioFilePath: string,
  userId: string,
  agentId: string
) {
  try {
    const audioData = fs.readFileSync(audioFilePath);

    const response = await fetch(AZURE_ENDPOINT, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "audio/wav"
      },
      body: audioData
    });

    if (!response.ok) {
      throw new Error(`Azure STT failed: ${response.status}`);
    }

    const result = await response.json();
    const text = result.DisplayText || "";

    // Save transcription in Redis
    await saveConversationSegment(userId, agentId, text);

    console.log(`Transcription saved for user ${userId} and agent ${agentId}`);
    return text;
  } catch (err) {
    console.error("Transcription failed:", err);
    throw err;
  }
}
