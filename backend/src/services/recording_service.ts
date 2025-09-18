import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import FormData from "form-data";
import fetch, { Response } from "node-fetch";
import { saveConversationSegment, saveEgressId, getEgressId } from "./redis_service";
import { EgressClient, EncodedFileType, RoomCompositeOptions, EncodedFileOutput } from "livekit-server-sdk";

dotenv.config();

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_URL = process.env.LIVEKIT_URL!; // e.g. https://xxx.livekit.cloud

// Validate environment variables
if (!LIVEKIT_API_KEY) throw new Error('LIVEKIT_API_KEY is required');
if (!LIVEKIT_SECRET) throw new Error('LIVEKIT_SECRET is required');
if (!LIVEKIT_URL) throw new Error('LIVEKIT_URL is required');
if (!LIVEKIT_URL.startsWith('https://')) throw new Error('LIVEKIT_URL must be a valid HTTPS URL starting with https:// (e.g., https://project.livekit.cloud)');

console.log('LiveKit Configuration:');
console.log('API Key:', LIVEKIT_API_KEY.substring(0, 8) + '...');
console.log('URL (Host):', LIVEKIT_URL);

// Correct constructor order: (host/url, apiKey, secret) - Fixed to match SDK signature
let egressClient: EgressClient;
try {
  egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_SECRET);
  console.log('✅ EgressClient initialized successfully');
} catch (initError: any) {
  console.error('❌ Failed to initialize EgressClient:', initError.message);
  throw initError;
}

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY!;
const AZURE_URL = process.env.AZURE_URL!; // Azure audio transcription endpoint

export async function startRecording(roomName: string) {
  console.log('Starting recording for room:', roomName);
  console.log('Using LiveKit URL (Host):', LIVEKIT_URL);
  
  // For LiveKit Cloud: Use empty output configuration for temporary cloud storage
  // This generates a temporary download URL that we can fetch later
  const output: EncodedFileOutput = {} as EncodedFileOutput; // Empty config for cloud temp storage
  
  // Alternative: Explicitly specify MP4 without additional config (some versions accept this)
  // const output: EncodedFileOutput = {
  //   fileType: EncodedFileType.MP4,
  // } as EncodedFileOutput;

  // Layout options
  const opts: RoomCompositeOptions = {
    layout: "grid",
  };

  try {
    console.log('🚀 Starting room composite egress...');
    const egressInfo = await egressClient.startRoomCompositeEgress(roomName, output, opts);
    
    // Save the egress ID for later use
    if (egressInfo.egressId) {
      await saveEgressId(roomName, egressInfo.egressId);
      console.log('💾 Egress ID saved to Redis:', egressInfo.egressId);
    }
    
    console.log('✅ Recording started successfully:', egressInfo.egressId);
    return egressInfo;
  } catch (error: any) {
    console.error('❌ Error in startRoomCompositeEgress:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
      console.error('Code:', error.code);
      console.error('Metadata:', error.metadata);
    }
    throw error;
  }
}

/**
 * Stop recording and save to local storage
 * This downloads from LiveKit Cloud's temporary storage to your local recordings folder
 */
export async function stopRecording(roomId: string): Promise<string> {
  const egressId = await getEgressId(roomId);
  if (!egressId) throw new Error(`No egressId found for room ${roomId}`);

  console.log('🛑 Stopping recording for egress ID:', egressId);

  try {
    // Ensure recordings directory exists
    const recordingsDir = path.join(process.cwd(), "recordings");
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
      console.log('📁 Created recordings directory:', recordingsDir);
    }

    // Stop the egress and get the file URL
    console.log('⏳ Stopping egress...');
    const info: any = await egressClient.stopEgress(egressId);
    console.log('📊 Egress stopped. Status:', info?.status);

    // For LiveKit Cloud temporary storage, we need to check the egress status
    // The file URL might not be immediately available after stopEgress
    if (info?.status === 'ACTIVE' || info?.status === 'UPDATING') {
      console.log('⏳ Egress still processing, waiting for completion...');
      // Wait up to 30 seconds for processing to complete
      let attempts = 0;
      let egressStatus = info;
      
      while (attempts < 15 && egressStatus?.status !== 'COMPLETED' && egressStatus?.status !== 'FAILED') {
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        try {
          egressStatus = await egressClient.listEgress(egressId);
          console.log(`📊 Egress status (attempt ${attempts + 1}):`, egressStatus?.[0]?.status);
        } catch (statusError: any) {
          console.warn('⚠️ Could not check status:', statusError.message);
        }
        attempts++;
      }
    }

    // Check for file results
    const fileResult = info?.fileResults?.[0] || (await egressClient.listEgress(egressId))?.[0]?.fileResults?.[0];
    if (!fileResult) {
      throw new Error("No file result found. Egress may have failed or is still processing. Check LiveKit dashboard.");
    }

    const fileUrl = fileResult.location;
    if (!fileUrl) {
      throw new Error("No file URL found in egress result");
    }

    console.log('📥 Downloading recording from:', fileUrl);

    // Download the file with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        // Create a timeout wrapper for fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for large files

        // Try with auth header first (LiveKit Cloud often requires it for temp URLs)
        let audioResp: Response = await fetch(fileUrl, {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${LIVEKIT_API_KEY}`,
          }
        });

        clearTimeout(timeoutId);

        if (!audioResp.ok) {
          // If auth fails, try without auth
          if (audioResp.status === 401 || audioResp.status === 403) {
            console.log('🔑 Auth failed, trying without auth header...');
            
            // Create new controller for second attempt
            const noAuthController = new AbortController();
            const noAuthTimeoutId = setTimeout(() => noAuthController.abort(), 60000);
            
            const noAuthResp: Response = await fetch(fileUrl, {
              signal: noAuthController.signal,
            });
            
            clearTimeout(noAuthTimeoutId);

            if (!noAuthResp.ok) {
              throw new Error(`HTTP ${noAuthResp.status}: ${noAuthResp.statusText}`);
            }
            
            // Properly assign the successful response
            audioResp = noAuthResp;
          } else {
            throw new Error(`HTTP ${audioResp.status}: ${audioResp.statusText}`);
          }
        }

        // Get file size for progress indication
        const contentLength = audioResp.headers.get('content-length');
        console.log(`📊 File size: ${contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}`);

        const buffer = Buffer.from(await audioResp.arrayBuffer());

        // Save to local storage
        const timestamp = Date.now();
        const localPath = path.join(recordingsDir, `${roomId}-recording-${timestamp}.mp4`);
        
        fs.writeFileSync(localPath, buffer);
        
        console.log('✅ Recording saved locally:', localPath);
        console.log('📏 File size:', `${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        
        return localPath;

      } catch (downloadError: any) {
        attempts++;
        console.warn(`⚠️ Download attempt ${attempts} failed:`, downloadError.message);
        
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to download recording after ${maxAttempts} attempts: ${downloadError.message}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 3000 * attempts);
        });
      }
    }

    throw new Error('Download failed after all attempts');

  } catch (error: any) {
    console.error('❌ Error stopping recording:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    throw error;
  }
}

/**
 * Transcribe audio chunk using Azure STT
 */
export async function transcribeAudioChunk(
  audioFilePath: string,
  userId: string,
  agentId: string
): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    console.log(`🎤 Transcribing: ${path.basename(audioFilePath)}`);
    
    const formData = new FormData();
    formData.append("file", fs.createReadStream(audioFilePath));
    formData.append("model", "gpt-4o-mini-transcribe");

    // Add timeout for transcription
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for transcription

    const response: Response = await fetch(AZURE_URL, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${AZURE_SPEECH_KEY}`, 
        ...formData.getHeaders() 
      },
      body: formData as any,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure STT failed: ${response.status} - ${errorText}`);
    }
    
    const result: any = await response.json();
    const text = result?.text || result?.DisplayText || "";

    if (text.trim()) {
      await saveConversationSegment(userId, agentId, text);
      console.log(`✅ Transcribed (${text.length} chars): "${text.substring(0, 100)}..."`);
    } else {
      console.log('⚠️ No transcription text returned');
    }

    return text;
  } catch (error: any) {
    console.error('❌ Error transcribing audio:', error.message);
    throw error;
  }
}

/**
 * Stop recording and transcribe full recording
 */
export async function transcribeFullRecording(
  roomId: string,
  userId: string,
  agentId: string
): Promise<string> {
  console.log(`🎙️ Starting full transcription for room ${roomId}`);
  
  try {
    const localPath = await stopRecording(roomId);
    const transcription = await transcribeAudioChunk(localPath, userId, agentId);
    console.log(`✅ Full transcription completed for room ${roomId}`);
    return transcription;
  } catch (error: any) {
    console.error(`❌ Transcription failed for room ${roomId}:`, error.message);
    throw error;
  }
}

/**
 * Check egress status (useful for debugging)
 */
export async function checkEgressStatus(roomId: string): Promise<any | null> {
  const egressId = await getEgressId(roomId);
  if (!egressId) {
    console.log(`⚠️ No egress ID found for room ${roomId}`);
    return null;
  }

  try {
    console.log(`🔍 Checking status for egress ${egressId}...`);
    const status = await egressClient.listEgress(egressId);
    
    if (status && status.length > 0) {
      const egressStatus = status[0];
      console.log(`📊 Egress ${egressId} status:`, {
        status: egressStatus.status,
        roomName: egressStatus.roomName,
        startedAt: egressStatus.startedAt,
        endedAt: egressStatus.endedAt,
        fileResults: egressStatus.fileResults?.length || 0
      });
      return egressStatus;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error checking egress status:', error.message);
    return null;
  }
}