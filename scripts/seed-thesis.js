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
function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("\n🌱 Seeding 70 dummy Thesis rows (students enrollmentYear=2022)...");

  const students2022 = await prisma.student.findMany({
    where: { enrollmentYear: 2022 },
    select: { id: true },
  });

  if (!students2022.length) {
    console.log("⚠️ No students found with enrollmentYear=2022. Aborting without changes.");
    return;
  }

  const [topics, statuses, academicYears] = await Promise.all([
    prisma.thesisTopic.findMany({ select: { id: true, name: true } }),
    prisma.thesisStatus.findMany({ select: { id: true, name: true } }),
    prisma.academicYear.findMany({ select: { id: true } }),
  ]);

  const AY_IDS = academicYears.map((ay) => ay.id);
  const topicList = topics;
  const statusList = statuses;

  const START_RANGE = new Date("2024-01-01T00:00:00Z");
  const END_RANGE = new Date("2025-12-31T23:59:59Z");

  const toCreate = [];
  const total = 70;
  for (let i = 0; i < total; i++) {
    const student = students2022[i % students2022.length];
    const topic = randPick(topicList);
    const status = randPick(statusList);
    const ayId = AY_IDS.length ? randPick(AY_IDS) : null;

    const start = randomDateBetween(START_RANGE, END_RANGE);
    const deadline = addDays(start, randInt(90, 180));

    const seq = i + 1;
    const title = `${topic?.name || "Thesis"} ${seq}`;

    toCreate.push({
      studentId: student.id,
      thesisTopicId: topic?.id || null,
      thesisStatusId: status?.id || null,
      academicYearId: ayId,
      title,
      startDate: start,
      deadlineDate: deadline,
      documentId: null,
      thesisProposalId: null,
    });
  }

  const result = await prisma.thesis.createMany({ data: toCreate });
  console.log(`✅ Thesis dummy inserted: ${result.count}/${total}`);
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
