// Use the generated Prisma client from custom output path configured in prisma/schema.prisma
// generator client { output = "../src/generated/prisma" }
import generated from "../generated/prisma/index.js";
const { PrismaClient } = generated;

const prisma = new PrismaClient();

export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    throw err;
  }
}

export default prisma;
