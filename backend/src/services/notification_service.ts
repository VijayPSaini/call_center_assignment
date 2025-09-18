import redis from "../config/redis";

export async function publishNotification(channel: string, message: any) {
  await redis.publish(channel, JSON.stringify(message));
  console.log(`📢 Published to ${channel}:`, message);
}
