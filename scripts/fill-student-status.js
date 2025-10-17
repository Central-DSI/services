// Set studentStatusId for students where it's null to a desired status (default: 'Aktif')
// Usage:
//   node scripts/fill-student-status.js              # uses name 'Aktif'
//   node scripts/fill-student-status.js --name=Aktif # explicit by name
//   node scripts/fill-student-status.js --id=<uuid>  # explicit by id

import 'dotenv/config';
import prisma from "../src/config/prisma.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { name: 'Aktif', id: undefined };
  for (const a of args) {
    const [k, v] = a.replace(/^--/, "").split("=");
    if (k === 'name' && v) out.name = v;
    if (k === 'id' && v) out.id = v;
  }
  return out;
}

async function getTargetStatus({ id, name }) {
  if (id) {
    const status = await prisma.studentStatus.findFirst({ where: { id } });
    if (!status) throw new Error(`StudentStatus with id '${id}' not found`);
    return status;
  }
  const status = await prisma.studentStatus.findFirst({ where: { name } });
  if (!status) throw new Error(`StudentStatus with name '${name}' not found`);
  return status;
}

async function main() {
  const args = parseArgs();
  console.log(`Setting studentStatusId=null -> '${args.id ? args.id : args.name}'...`);

  const target = await getTargetStatus(args);

  // Find students with null status
  const students = await prisma.student.findMany({
    where: { studentStatusId: null },
    select: { id: true },
  });

  if (!students.length) {
    console.log("No students with null status found. Nothing to update.");
    return;
  }

  console.log(`Found ${students.length} student(s) to update.`);

  const updates = students.map((s) =>
    prisma.student.update({ where: { id: s.id }, data: { studentStatusId: target.id } })
  );

  const result = await prisma.$transaction(updates, { timeout: 60000 }).catch(async (err) => {
    console.error("Transaction failed, falling back to sequential updates:", err.message);
    let count = 0;
    for (const s of students) {
      try {
        await prisma.student.update({ where: { id: s.id }, data: { studentStatusId: target.id } });
        count++;
      } catch (e) {
        console.error(`Failed updating student ${s.id}:`, e.message);
      }
    }
    return { fallbackUpdated: count };
  });

  if (Array.isArray(result)) {
    console.log(`Updated ${result.length} student(s) successfully.`);
  } else if (result && typeof result.fallbackUpdated === 'number') {
    console.log(`Updated ${result.fallbackUpdated} student(s) (sequential fallback).`);
  } else {
    console.log("Update completed.");
  }
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
