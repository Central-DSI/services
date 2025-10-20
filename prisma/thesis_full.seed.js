import prisma from "../src/config/prisma.js";

function addYears(date, years = 1) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(arr) {
  if (!arr?.length) return null;
  return arr[randInt(0, arr.length - 1)];
}

async function ensureAcademicYears() {
  const defs = [
    { semester: "ganjil", year: 2024, startDate: new Date("2024-08-01"), endDate: new Date("2025-01-31") },
    { semester: "genap", year: 2025, startDate: new Date("2025-02-01"), endDate: new Date("2025-07-31") },
    { semester: "ganjil", year: 2025, startDate: new Date("2025-08-01"), endDate: new Date("2026-01-31") },
  ];

  let created = 0;
  for (const ay of defs) {
    const exists = await prisma.academicYear.findFirst({ where: { semester: ay.semester, year: ay.year } });
    if (!exists) {
      await prisma.academicYear.create({ data: ay });
      created++;
    }
  }
  console.log(`📅 AcademicYear created: ${created}`);
}

async function ensureTopicsAndStatuses() {
  const topics = [
    "Sistem Pendukung Keputusan (SPK)",
    "Bussiness Intelligence (BI)",
    "Pengembangan Sistem (Enterprise Application)",
    "Machine Learning",
    "Enterprise System",
  ];
  const statuses = ["Ongoing", "Slow", "at_risk", "completed", "failed"];

  const existingTopics = await prisma.thesisTopic.findMany({ select: { id: true, name: true } });
  const topicSet = new Set(existingTopics.map((t) => (t.name || "").trim().toLowerCase()));
  const toCreateTopics = topics.filter((n) => !topicSet.has(n.toLowerCase()));
  if (toCreateTopics.length) {
    await prisma.thesisTopic.createMany({ data: toCreateTopics.map((name) => ({ name })) });
  }

  const existingStatuses = await prisma.thesisStatus.findMany({ select: { id: true, name: true } });
  const statusSet = new Set(existingStatuses.map((s) => (s.name || "").trim().toLowerCase()));
  const toCreateStatuses = statuses.filter((n) => !statusSet.has(n.toLowerCase()));
  if (toCreateStatuses.length) {
    await prisma.thesisStatus.createMany({ data: toCreateStatuses.map((name) => ({ name })) });
  }

  // Re-load to get IDs
  const topicsAll = await prisma.thesisTopic.findMany();
  const statusesAll = await prisma.thesisStatus.findMany();
  return { topicsAll, statusesAll };
}

function chooseStatusAndStartDate(now = new Date()) {
  // Weighted choice across statuses
  const buckets = [
    { name: "Ongoing", weight: 35, startRangeMonths: [0, 6] },
    { name: "Slow", weight: 20, startRangeMonths: [8, 12] },
    { name: "at_risk", weight: 15, startRangeMonths: [13, 18] },
    { name: "completed", weight: 20, startRangeMonths: [4, 12] },
    { name: "failed", weight: 10, startRangeMonths: [13, 24] },
  ];
  const total = buckets.reduce((a, b) => a + b.weight, 0);
  let r = Math.random() * total;
  let chosen = buckets[0];
  for (const b of buckets) {
    if (r < b.weight) { chosen = b; break; }
    r -= b.weight;
  }
  const [minM, maxM] = chosen.startRangeMonths;
  const monthsAgo = randInt(minM, maxM);
  const start = new Date(now);
  start.setMonth(start.getMonth() - monthsAgo);
  return { statusName: chosen.name, startDate: start, deadlineDate: addYears(start, 1) };
}

function findAcademicYearForDate(academicYears, date) {
  const t = new Date(date).getTime();
  for (const ay of academicYears) {
    const s = ay.startDate ? new Date(ay.startDate).getTime() : null;
    const e = ay.endDate ? new Date(ay.endDate).getTime() : null;
    if (s != null && e != null && t >= s && t <= e) return ay;
  }
  return null;
}

async function seedTheses() {
  const { topicsAll, statusesAll } = await ensureTopicsAndStatuses();
  const topics = topicsAll;
  const statusByLower = new Map(statusesAll.map((s) => [String(s.name || "").toLowerCase(), s]));

  const academicYears = await prisma.academicYear.findMany();
  const lecturers = await prisma.lecturer.findMany({ select: { id: true } });
  const students = await prisma.student.findMany({
    select: { id: true, user: { select: { fullName: true } } },
  });

  if (!students.length) {
    console.log("ℹ️ No students found. Skipping theses seeding.");
    return;
  }
  if (!lecturers.length) {
    console.log("ℹ️ No lecturers found. Theses will be created without participants.");
  }

  let createdCount = 0;
  for (const s of students) {
    const already = await prisma.thesis.findFirst({ where: { studentId: s.id } });
    if (already) continue;

    const topic = pickOne(topics);
    const { statusName, startDate, deadlineDate } = chooseStatusAndStartDate();
    const status = statusByLower.get(String(statusName).toLowerCase());
    const ay = findAcademicYearForDate(academicYears, startDate);

    const title = `${s.user?.fullName || "Mahasiswa"} - ${topic?.name || "Topik"}`;
    const thesis = await prisma.thesis.create({
      data: {
        studentId: s.id,
        thesisTopicId: topic?.id || null,
        thesisStatusId: status?.id || null,
        academicYearId: ay?.id || null,
        title,
        startDate,
        deadlineDate,
      },
      select: { id: true },
    });
    createdCount++;

    // Add participants when lecturers exist
    if (lecturers.length) {
      const lecturerIds = lecturers.map((l) => l.id);
      const sup1 = pickOne(lecturerIds);
      const sup2 = Math.random() < 0.4 ? pickOne(lecturerIds) : null; // 40% have supervisor 2
      const ex1 = pickOne(lecturerIds);
      const ex2 = pickOne(lecturerIds);

      const parts = [];
      if (sup1) parts.push({ thesisId: thesis.id, lecturerId: sup1, role: "SUPERVISOR_1" });
      if (sup2 && sup2 !== sup1) parts.push({ thesisId: thesis.id, lecturerId: sup2, role: "SUPERVISOR_2" });
      if (ex1 && ex1 !== sup1 && ex1 !== sup2) parts.push({ thesisId: thesis.id, lecturerId: ex1, role: "EXAMINER_1" });
      if (ex2 && ex2 !== sup1 && ex2 !== sup2 && ex2 !== ex1) parts.push({ thesisId: thesis.id, lecturerId: ex2, role: "EXAMINER_2" });

      if (parts.length) {
        await prisma.thesisParticipant.createMany({ data: parts });
      }
    }
  }

  console.log(`📝 Theses created: ${createdCount}`);
}

async function main() {
  console.log("🌱 Seeding AcademicYears, Topics, Statuses, and Theses...");
  await ensureAcademicYears();
  await seedTheses();
  console.log("✅ Seeding done.");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error("❌ Seed error:", e); await prisma.$disconnect(); process.exit(1); });
