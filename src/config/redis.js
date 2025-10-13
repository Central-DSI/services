import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error:", err.message);
});

export async function checkRedisConnection() {
  try {
    if (!redisClient.isOpen) await redisClient.connect();
    await redisClient.ping();
    console.log("✅ Redis connected successfully");
  } catch (err) {
    console.error("❌ Redis connection failed:", err.message);
    throw err;
  }
}

export default redisClient;
