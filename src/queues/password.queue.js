import pkg from "bullmq";
const { Queue, Worker } = pkg;
import { ENV } from "../config/env.js";
import { sendMail } from "../config/mailer.js";
import { passwordAssignedTemplate } from "../utils/emailTemplate.js";

function buildRedisConnection(url) {
  try {
    const u = new URL(url || "redis://localhost:6379");
    const conn = {
      host: u.hostname || "localhost",
      port: u.port ? Number(u.port) : 6379,
    };
    if (u.password) conn.password = u.password;
    if (u.protocol === "rediss:") conn.tls = {};
    return conn;
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

const connection = { connection: buildRedisConnection(ENV.REDIS_URL) };

export const PASSWORD_EMAIL_QUEUE = "password-email";

export const passwordEmailQueue = new Queue(
  PASSWORD_EMAIL_QUEUE,
  {
    ...connection,
    limiter: {
      max: 10, // at most 10 jobs
      duration: 60_000, // per minute
    },
  }
);
// Note: BullMQ v5 no longer requires QueueScheduler; delayed/retry are handled internally.

// Worker to process sending password emails
export const passwordEmailWorker = new Worker(
  PASSWORD_EMAIL_QUEUE,
  async (job) => {
    const { to, fullName, password, loginUrl, appName } = job.data || {};
    if (!to || !password) return;
    const html = passwordAssignedTemplate({ appName, fullName, email: to, password, loginUrl });
    await sendMail({ to, subject: `${appName || "App"} - Your Account Password`, html });
  },
  {
    ...connection,
    concurrency: 1, // process sequentially to avoid SMTP throttling
    // limiter: { max: 10, duration: 60_000 } // BullMQ v5 global limiter is set on Queue, not Worker
  }
);

passwordEmailWorker.on("completed", (job) => {
  if (ENV.NODE_ENV !== "test") console.log(`📧 Password email sent → ${job.id}`);
});
passwordEmailWorker.on("failed", (job, err) => {
  console.error(`❌ Password email failed (job ${job?.id}):`, err?.message || err);
});

export async function enqueuePasswordEmail(
  { to, fullName, password, loginUrl, appName },
  opts = { attempts: 5, backoff: { type: "exponential", delay: 10_000 }, delay: 2_000 }
) {
  return passwordEmailQueue.add("sendPasswordEmail", { to, fullName, password, loginUrl, appName }, opts);
}
