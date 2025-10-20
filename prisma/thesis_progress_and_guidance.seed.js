import prisma from "../src/config/prisma.js";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickSomeUnique(arr, count) {
  if (!arr || !arr.length) return [];
  const copy = [...arr];
  const picked = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = randInt(0, copy.length - 1);
    picked.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return picked;
}

function clampDate(d, min, max) {
  const t = d.getTime();
  const tmin = min ? min.getTime() : t;
  const tmax = max ? max.getTime() : t;
  return new Date(Math.max(tmin, Math.min(t, tmax)));
}

function randomDateBetween(start, end) {
  const s = start.getTime();
  const e = end.getTime();
  const t = s + Math.random() * (e - s);
  return new Date(t);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function seedThesisProgressCompletions() {
  const components = await prisma.thesisProgressComponent.findMany({ select: { id: true } });
  if (!components.length) {
    console.log("ℹ️ No ThesisProgressComponent found. Skipping progress completions.");
    return { created: 0 };
  }

  const theses = await prisma.thesis.findMany({
    select: { id: true, startDate: true, deadlineDate: true },
  });

  const now = new Date();
  let created = 0;
  for (const t of theses) {
    const existingCount = await prisma.thesisProgressCompletion.count({ where: { thesisId: t.id } });
    if (existingCount > 0) continue; // idempotent per thesis

    // Choose 2-5 components to mark as (possibly) completed
    const selected = pickSomeUnique(components.map((c) => c.id), randInt(2, 5));

    const s = t.startDate ? new Date(t.startDate) : addDays(now, -60);
    const endCap = t.deadlineDate ? new Date(t.deadlineDate) : now;
    const end = endCap < now ? endCap : now;

    const rows = selected.map((componentId) => {
      const completedAt = Math.random() < 0.75 ? randomDateBetween(s, end) : null; // 75% have a completion date
      return {
        thesisId: t.id,
        componentId,
        completedAt,
        validatedBySupervisor: completedAt ? Math.random() < 0.6 : false, // validate if completed, 60% chance
      };
    });

    if (rows.length) {
      await prisma.thesisProgressCompletion.createMany({ data: rows });
      created += rows.length;
    }
  }

  console.log(`✅ ThesisProgressCompletion created: ${created}`);
  return { created };
}

async function seedThesisGuidance() {
  const lecturers = await prisma.lecturer.findMany({ select: { id: true } });
  const lecturerIds = lecturers.map((l) => l.id);
  if (!lecturerIds.length) {
    console.log("ℹ️ No lecturers found. Skipping thesis guidance seeding.");
    return { schedules: 0, guidances: 0 };
  }

  const theses = await prisma.thesis.findMany({
    select: {
      id: true,
      startDate: true,
      deadlineDate: true,
      thesisParticipants: {
        select: { lecturerId: true, role: true },
      },
    },
  });

  const now = new Date();
  let schedulesCreated = 0;
  let guidancesCreated = 0;

  for (const t of theses) {
    const existingCount = await prisma.thesisGuidance.count({ where: { thesisId: t.id } });
    if (existingCount > 0) continue; // idempotent per thesis

    const supervisors = t.thesisParticipants
      .filter((p) => p.role === "SUPERVISOR_1" || p.role === "SUPERVISOR_2")
      .map((p) => p.lecturerId)
      .filter(Boolean);

    const sessions = randInt(2, 4);
    const s = t.startDate ? new Date(t.startDate) : addDays(now, -45);
    const endCap = t.deadlineDate ? new Date(t.deadlineDate) : now;
    const end = endCap < now ? endCap : now;

    for (let i = 0; i < sessions; i++) {
      const guidanceDate = randomDateBetween(s, end);
      const schedule = await prisma.thesisGuidanceSchedule.create({
        data: { guidanceDate },
        select: { id: true },
      });
      schedulesCreated++;

      const supervisorId = supervisors.length
        ? supervisors[randInt(0, supervisors.length - 1)]
        : lecturerIds[randInt(0, lecturerIds.length - 1)];

      const isPast = guidanceDate.getTime() < now.getTime();
      const status = isPast ? "completed" : "scheduled";
      const studentNotes = Math.random() < 0.8 ? `Diskusi ke-${i + 1} tentang progres tesis.` : null;
      const supervisorFeedback = isPast && Math.random() < 0.7 ? `Catatan pembimbing untuk sesi ${i + 1}.` : null;
      const meetingUrl = Math.random() < 0.5 ? `https://meet.example.com/${t.id.slice(0, 8)}-${i + 1}` : null;

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
      guidancesCreated++;
    }
  }

  console.log(`✅ ThesisGuidanceSchedule created: ${schedulesCreated}`);
  console.log(`✅ ThesisGuidance created: ${guidancesCreated}`);
  return { schedules: schedulesCreated, guidances: guidancesCreated };
}

async function main() {
  console.log("🌱 Seeding ThesisProgressCompletion, ThesisGuidanceSchedule, ThesisGuidance...");
  await seedThesisProgressCompletions();
  await seedThesisGuidance();
  console.log("🎉 Seeding finished.");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error("❌ Seed error:", e); await prisma.$disconnect(); process.exit(1); });
