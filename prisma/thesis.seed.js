import prisma from "../src/config/prisma.js";

async function seedThesisTopics() {
  const topics = [
    "Sistem Pendukung Keputusan (SPK)",
    "Bussiness Intelligence (BI)",
    "Pengembangan Sistem (Enterprise Application)",
    "Machine Learning",
    "Enterprise System",
  ];

  const existing = await prisma.thesisTopic.findMany({ select: { name: true } });
  const existingSet = new Set(existing.map((t) => (t.name || "").trim().toLowerCase()));
  const toCreate = topics.filter((n) => !existingSet.has(String(n).trim().toLowerCase()));

  if (toCreate.length) {
    await prisma.thesisTopic.createMany({ data: toCreate.map((name) => ({ name })) });
  }

  console.log(`📚 ThesisTopics: existing=${existing.length}, created=${toCreate.length}`);
}

async function seedThesisStatuses() {
  const statuses = ["Ongoing", "Slow", "at_risk", "completed", "failed"];

  const existing = await prisma.thesisStatus.findMany({ select: { name: true } });
  const existingSet = new Set(existing.map((s) => (s.name || "").trim().toLowerCase()));
  const toCreate = statuses.filter((n) => !existingSet.has(String(n).trim().toLowerCase()));

  if (toCreate.length) {
    await prisma.thesisStatus.createMany({ data: toCreate.map((name) => ({ name })) });
  }

  console.log(`📊 ThesisStatus: existing=${existing.length}, created=${toCreate.length}`);
}

async function main() {
  console.log("🌱 Seeding Thesis Topics & Statuses...");
  await seedThesisTopics();
  await seedThesisStatuses();
  console.log("✅ Seeding completed.");
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
