import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST,              // eco.eastasia.redis.azure.net
  port: Number(process.env.REDIS_PORT),      // 10000
  password: process.env.REDIS_PRIMARY_KEY,   // your key
  tls: {},                                   // enable TLS for Azure Redis
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

export default redis;
