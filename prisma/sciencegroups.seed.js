/* eslint-disable no-console */
// Use explicit file path for ESM to avoid directory import error
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const groups = [
    { name: 'Rekayasa Data dan Business Intelligence' },
    { name: 'System Development' },
    { name: 'Tata Kelola dan Infrastruktur Teknologi Informasi' },
    { name: 'Sistem Enterprise' },
  ];

  const existing = await prisma.scienceGroup.findMany({
    where: { name: { in: groups.map((g) => g.name) } },
    select: { name: true },
  });

  const existingNames = new Set(existing.map((g) => g.name));
  const toCreate = groups.filter((g) => !existingNames.has(g.name));

  if (toCreate.length === 0) {
    console.log('Science groups already seeded. No changes made.');
    return;
  }

  await prisma.scienceGroup.createMany({
    data: toCreate.map((g) => ({ name: g.name })),
  });

  console.log(`Inserted ${toCreate.length} science group(s):`);
  toCreate.forEach((g) => console.log(`- ${g.name}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });