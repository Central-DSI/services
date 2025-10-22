import prisma from "../src/config/prisma.js";

const TOPICS = [
  "Sistem Pendukung Keputusan (SPK)",
  "Bussiness Intelligence (BI)",
  "Pengembangan Sistem (Enterprise Application)",
  "Machine Learning",
  "Enterprise System",
];

const STATUSES = [
  "Ongoing",
  "Slow",
  "at_risk",
  "completed",
  "failed",
];

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

async function seedThesisTopics() {
  console.log("\n🌱 Seeding ThesisTopic...");
  const existing = await prisma.thesisTopic.findMany({ select: { name: true } });
  const existingSet = new Set(existing.map((e) => norm(e.name)));
  const toCreate = TOPICS.filter((t) => !existingSet.has(norm(t))).map((name) => ({ name }));
  if (toCreate.length) {
    await prisma.thesisTopic.createMany({ data: toCreate });
  }
  console.log(`✅ ThesisTopic: existing=${existing.length}, created=${toCreate.length}`);
}

async function seedThesisStatuses() {
  console.log("\n🌱 Seeding ThesisStatus...");
  const existing = await prisma.thesisStatus.findMany({ select: { name: true } });
  const existingSet = new Set(existing.map((e) => norm(e.name)));
  const toCreate = STATUSES.filter((s) => !existingSet.has(norm(s))).map((name) => ({ name }));
  if (toCreate.length) {
    await prisma.thesisStatus.createMany({ data: toCreate });
  }
  console.log(`✅ ThesisStatus: existing=${existing.length}, created=${toCreate.length}`);
}

async function main() {
  await seedThesisTopics();
  await seedThesisStatuses();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("\n🌸 Seeding selesai.");
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
