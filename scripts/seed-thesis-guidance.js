import prisma from "../src/config/prisma.js";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randPick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[randInt(0, arr.length - 1)];
}
function randomDateBetween(start, end) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const t = randInt(startMs, endMs);
  return new Date(t);
}
function clampDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return new Date();
  return d;
}

async function pickSupervisorForThesis(thesisId) {
  // Prefer pembimbing1, else pembimbing2
  const parts = await prisma.thesisParticipant.findMany({
    where: { thesisId },
    include: { role: true },
  });
  // normalize role names
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");
  const sup1 = parts.find((p) => norm(p.role?.name) === "pembimbing1");
  if (sup1) return sup1.lecturerId;
  const sup2 = parts.find((p) => norm(p.role?.name) === "pembimbing2");
  if (sup2) return sup2.lecturerId;
  // fallback any participant's lecturer
  return parts[0]?.lecturerId || null;
}

function makeMeetingUrl() {
  const token = Math.random().toString(36).slice(2, 10);
  return `https://meet.example.com/${token}`;
}

async function main() {
  console.log("\n🌱 Seeding Thesis Guidance & Schedules (use existing data, avoid nulls where possible)...");

  // Get theses; include counts to skip ones already seeded
  const theses = await prisma.thesis.findMany({
    select: {
      id: true,
      startDate: true,
      deadlineDate: true,
      _count: { select: { thesisGuidances: true } },
    },
  });

  if (!theses.length) {
    console.log("⚠️ No thesis found. Nothing to seed.");
    return;
  }

  let totalGuidances = 0;

  for (const t of theses) {
    // Idempotent: skip if already has any guidance
    if ((t._count?.thesisGuidances || 0) > 0) continue;

    const supervisorId = await pickSupervisorForThesis(t.id);
    if (!supervisorId) {
      // No supervisor linked; skip this thesis
      continue;
    }

    // Determine date range for schedules
    const start = clampDate(t.startDate || new Date("2025-01-01T00:00:00Z"));
    const end = clampDate(t.deadlineDate || new Date("2025-12-31T23:59:59Z"));
    const from = start < end ? start : new Date("2025-01-01T00:00:00Z");
    const to = start < end ? end : new Date("2025-12-31T23:59:59Z");

    // Create 2-4 guidance sessions per thesis
    const sessions = randInt(2, 4);
    // If range is too small, widen a bit
    const baseFrom = from;
    const baseTo = to;

    // Sort dates ascending
    const dates = [];
    for (let i = 0; i < sessions; i++) {
      const d = randomDateBetween(baseFrom, baseTo);
      dates.push(d);
    }
    dates.sort((a, b) => a - b);

    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      const schedule = await prisma.thesisGuidanceSchedule.create({
        data: { guidanceDate: d },
      });

      // Decide status by date (past => accepted, future => requested/accepted randomly)
      const now = new Date();
      const isPast = d < now;
      
      let status;
      let supervisorFeedback = null;
      
      if (isPast) {
        // Past dates: 90% accepted, 10% rejected
        status = Math.random() < 0.9 ? "accepted" : "rejected";
        supervisorFeedback = status === "accepted" 
          ? "Reviewed and noted." 
          : "Schedule conflict, please reschedule.";
      } else {
        // Future dates: 70% accepted, 20% requested, 10% rejected
        const rand = Math.random();
        if (rand < 0.7) {
          status = "accepted";
          supervisorFeedback = "Approved";
        } else if (rand < 0.9) {
          status = "requested";
          supervisorFeedback = null;
        } else {
          status = "rejected";
          supervisorFeedback = "Cannot accommodate this time.";
        }
      }

      const studentNotes = `Guidance session ${i + 1}: progress discussion`;
      const meetingUrl = status === "accepted" ? makeMeetingUrl() : null;

      await prisma.thesisGuidance.create({
        data: {
          thesisId: t.id,
          scheduleId: schedule.id,
          supervisorId,
          studentNotes,
          supervisorFeedback,
          meetingUrl,
          status,
        },
      });
      totalGuidances += 1;
    }
  }

  console.log(`✅ Seeded thesis_guidance: ${totalGuidances} rows (with matching schedules).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
