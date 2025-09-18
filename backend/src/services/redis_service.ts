import redis from "../config/redis";

// ---- User Session ----
export async function saveUserSession(userId: string, token: string, room: string) {
  await redis.hset(`user:${userId}:session`, {
    token,
    room,
    timestamp: Date.now().toString(),
  });
}

export async function getUserSession(userId: string) {
  return await redis.hgetall(`user:${userId}:session`);
}

// ---- Agent Session ----
export async function saveAgentSession(
  agentId: string,
  status: "online" | "offline",
  on_call: boolean = false,
  on_call_with: string | null = null,
  room: string | null = null
) {
  const now = Date.now().toString();

  await redis.hset(`agent:${agentId}:session`, {
    status,
    on_call: on_call.toString(),
    on_call_with,
    room,
    lastPing: now,
    lastCallEnd: null,
    created_at: now,
  });

  if (status === "online") {
    await redis.zadd("agents:available", 0, agentId);
  } else {
    await redis.zrem("agents:available", agentId);
  }
}

export async function updateAgentStatus(agentId: string, fields: Record<string, string>) {
  await redis.hset(`agent:${agentId}:session`, fields);
}

export async function removeAgentFromAvailable(agentId: string) {
  await redis.zrem("agents:available", agentId);
}

export async function pushAgentToQueueEnd(agentId: string) {
  await redis.zrem("agents:available", agentId);
  await redis.zadd("agents:available", Date.now(), agentId);
}

export async function findNextAvailableAgent(): Promise<string | null> {
  const result = await redis.zrange("agents:available", 0, 0);
  return result.length > 0 ? result[0] : null;
}

export async function getLiveAgents() {
  const raw = await redis.zrange("agents:available", 0, -1, "WITHSCORES");
  const agents: { agentId: string; score: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    agents.push({ agentId: raw[i], score: Number(raw[i + 1]) });
  }
  return agents;
}

// ---- Conversation Storage ----
/**
 * Save a conversation segment (text) for a user-agent pair
 * Can be used for chunked transcription too
 */
export async function saveConversationSegment(
  userId: string,
  agentId: string,
  text: string
) {
  const redisKey = `conversation:${userId}:${agentId}`;
  await redis.rpush(redisKey, text);
  await redis.expire(redisKey, 60 * 60 * 24); // 24h TTL
}

/**
 * Get full conversation for a user-agent pair
 */
export async function getConversation(userId: string, agentId: string) {
  const redisKey = `conversation:${userId}:${agentId}`;
  const conversation = await redis.lrange(redisKey, 0, -1);
  return conversation.join("\n");
}

/**
 * Clear conversation for a user-agent pair
 */
export async function clearConversation(userId: string, agentId: string) {
  const redisKey = `conversation:${userId}:${agentId}`;
  await redis.del(redisKey);
}

// ---- Egress (recording) storage ----
/**
 * Save egressId for a room
 */
export async function saveEgressId(roomId: string, egressId: string) {
  const key = `room:${roomId}:egress`;
await redis.set(key, egressId, "EX", 60 * 60 * 24);
}

/**
 * Get egressId for a room
 */
export async function getEgressId(roomId: string): Promise<string | null> {
  const key = `room:${roomId}:egress`;
  return await redis.get(key);
}

/**
 * Save partial audio chunk info for a user-agent pair
 */
export async function saveAudioChunk(userId: string, agentId: string, chunkText: string) {
  const key = `conversation:${userId}:${agentId}:chunks`;
  await redis.rpush(key, chunkText);
  await redis.expire(key, 60 * 60 * 24); // 24h TTL
}

/**
 * Get all audio chunks for a user-agent pair
 */
export async function getAudioChunks(userId: string, agentId: string) {
  const key = `conversation:${userId}:${agentId}:chunks`;
  return await redis.lrange(key, 0, -1);
}

/**
 * Clear audio chunks after final transcription merge
 */
export async function clearAudioChunks(userId: string, agentId: string) {
  const key = `conversation:${userId}:${agentId}:chunks`;
  await redis.del(key);
}
