// Seed database using the generated Prisma client (custom output path)
import generated from '../src/generated/prisma/index.js';
const { PrismaClient } = generated;

const prisma = new PrismaClient();

async function main() {
  // 1) 

  // 2) Seed UserRole (find-or-create without unique constraint)
  const roles = [
    'student',
    'admin',
    'kadep',
    'penguji',
    'pembimbing 1',
    'pembimbing 2',
    'sekretaris_departemen',
    'gkm',
  ];
  for (const name of roles) {
    const existing = await prisma.userRole.findFirst({ where: { name } });
    if (!existing) {
      await prisma.userRole.create({ data: { name } });
    }
  }
  console.log('2. UserRole seeded');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

