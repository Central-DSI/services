import { checkDatabaseConnection } from "./prisma.js";
import { checkRedisConnection } from "./redis.js";

export async function initConnections() {
  console.log("🔍 Checking database and Redis connections...");
  await checkDatabaseConnection();
  await checkRedisConnection();
  console.log("🚀 All connections established successfully");
}
