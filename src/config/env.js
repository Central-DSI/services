// src/config/env.js
import dotenv from "dotenv";

dotenv.config(); // load file .env

// helper kecil untuk parsing tipe data
const toBool = (val) => String(val).toLowerCase() === "true";
const toNum = (val, def = 0) => (val ? Number(val) : def);

export const ENV = {
  // ===============================
  // 🌐 SERVER CONFIGURATION
  // ===============================
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: toNum(process.env.PORT, 3000),
  BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",

  // ===============================
  // 🗄️ DATABASE (Prisma)f
  // ===============================
  DATABASE_URL: process.env.DATABASE_URL,

  // ===============================
  // 🧠 REDIS CONFIG
  // ===============================
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

  // ===============================
  // 📧 SMTP / EMAIL CONFIG
  // ===============================
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: toNum(process.env.SMTP_PORT, 587),
  SMTP_SECURE: toBool(process.env.SMTP_SECURE),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "",

  // ===============================
  // 🔐 AUTH
  // ===============================
  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || "",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",

  // ===============================
  // 🕒 CRON JOBS
  // ===============================
  CRON_TIME_NOTIFY: process.env.CRON_TIME_NOTIFY || "0 * * * *",
  ENABLE_CRON: toBool(process.env.ENABLE_CRON),
  // Thesis status cron controls
  THESIS_STATUS_CRON: process.env.THESIS_STATUS_CRON || "30 2 * * *", // 02:30 every day
  THESIS_STATUS_TZ: process.env.THESIS_STATUS_TZ || "Asia/Jakarta", // WIB (UTC+7)

  // ===============================
  // 🧰 LOGGING
  // ===============================
  LOG_LEVEL: process.env.LOG_LEVEL || "debug",
  LOG_TO_FILE: toBool(process.env.LOG_TO_FILE),

  // ===============================
  // 💌 META
  // ===============================
  APP_NAME: process.env.APP_NAME || "Backend API",
  APP_OWNER: process.env.APP_OWNER || "Orang Sigma",
};

// 🚨 Validasi sederhana: pastikan variabel penting terisi
const required = ["DATABASE_URL", "JWT_SECRET", "REFRESH_TOKEN_SECRET"];
for (const key of required) {
  if (!ENV[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    process.exit(1);
  }
}
