import { updateAllThesisStatuses } from "../services/thesisStatus.service.js";

export async function runThesisStatusJob() {
  const started = new Date();
  console.log(`🕒 [thesis-status] Job started at ${started.toISOString()}`);
  try {
    const summary = await updateAllThesisStatuses({ pageSize: 200, logger: console });
    const finished = new Date();
    console.log(
      `✅ [thesis-status] Job finished at ${finished.toISOString()} — updated: ${JSON.stringify(summary)}`
    );
  } catch (err) {
    console.error("❌ [thesis-status] Job failed:", err?.message || err);
  }
}
