// services/agent_matcher.ts
import redis from "../config/redis"

export async function findNextAvailableAgent(): Promise<string | null> {
  const result = await redis.zrange("agents:available", 0, 0);
  if (!result || result.length === 0) return null;
  return result[0];
}
