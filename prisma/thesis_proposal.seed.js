import prisma from "../src/config/prisma.js";

async function main() {
  console.log("🌱 Seeding Thesis Proposals from real Users/Students...");

  // Get all students (linked to users) to use real IDs
  const students = await prisma.student.findMany({
    select: {
      id: true,
      userId: true,
      user: { select: { email: true, fullName: true } },
    },
  });

  if (!students.length) {
    console.log("ℹ️ No students found. Nothing to seed.");
    return;
  }

  const studentIds = students.map((s) => s.id);

  // Find which students already have a proposal
  const existing = await prisma.thesisProposal.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true },
  });
  const existingSet = new Set(existing.map((e) => e.studentId));

  const toCreate = students
    .filter((s) => !existingSet.has(s.id))
    .map((s) => ({
      studentId: s.id,
      // documentId: null, // optional
      // status: 'submitted' // default by schema
    }));

  if (!toCreate.length) {
    console.log("✅ All students already have thesis proposals. Nothing to create.");
    return;
  }

  // Batch create (Prisma createMany)
  await prisma.thesisProposal.createMany({ data: toCreate });
  console.log(`✅ Created ${toCreate.length} thesis proposal(s).`);
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
