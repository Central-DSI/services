import "dotenv/config";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

function clean(v) {
  if (v == null) return "";
  return String(v).replace(/[\u00A0\u200B]/g, " ").trim();
}

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv({ separator: "," }))
      .on("data", (data) => {
        const row = {};
        for (const k of Object.keys(data)) {
          const key = k ? String(k).trim() : k;
          row[key] = data[k] != null ? clean(data[k]) : "";
        }
        rows.push(row);
      })
      .on("end", () => resolve(rows))
      .on("error", (err) => reject(err));
  });
}

async function getOrCreateRole(name) {
  let role = await prisma.userRole.findFirst({ where: { name } });
  if (!role) role = await prisma.userRole.create({ data: { name } });
  return role;
}

async function ensureRoleForUser(userId, roleId) {
  const existing = await prisma.userHasRole.findFirst({ where: { userId, roleId } });
  if (!existing) {
    await prisma.userHasRole.create({ data: { userId, roleId, status: "active" } });
    return true;
  }
  return false;
}

function deriveEnrollmentYearFromNIM(nim) {
  // Reuse same logic as util, but avoid importing app code into script
  const s = String(nim || "").trim();
  if (s.length >= 2) {
    const yy = parseInt(s.slice(0, 2), 10);
    if (!isNaN(yy)) return 2000 + yy;
  }
  return null;
}

async function run(fileOverride) {
  const filePath = fileOverride && fileOverride.trim().length > 0
    ? path.resolve(fileOverride)
    : path.join(process.cwd(), "data", "students.csv");

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File CSV tidak ditemukan: ${filePath}`);
    process.exit(1);
  }

  console.log(`📥 Membaca CSV: ${filePath}`);
  const rows = await readCsv(filePath);
  console.log(`📊 Total data dibaca: ${rows.length}`);

  const studentRole = await getOrCreateRole("student");

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const nim = clean(row.nim || row.NIM || "");
    const nama = clean(row.nama || row.name || "");
    const email = clean(row.email || "").toLowerCase();

    if (!nim || !email) {
      skipped++;
      console.warn(`⚠️ Skip baris karena nim/email kosong: ${JSON.stringify(row)}`);
      continue;
    }

    try {
      // Skip entirely if email already exists
      const emailExists = await prisma.user.findFirst({ where: { email }, select: { id: true } });
      if (emailExists) {
        skipped++;
        continue;
      }

      const existing = await prisma.user.findFirst({ where: { OR: [{ identityNumber: nim }, { email }] }, select: { id: true } });
      let userId;
      if (!existing) {
        const user = await prisma.user.create({
          data: {
            fullName: nama || "",
            identityNumber: nim,
            identityType: "NIM",
            email,
            password: null,
            isVerified: false,
          },
        });
        userId = user.id;
        created++;
        console.log(`✅ Created user (student): ${nama} (${nim})`);
      } else {
        skipped++;
        continue;
      }

      // Ensure student role
      await ensureRoleForUser(userId, studentRole.id);

      // Ensure Student row
      const existingStudent = await prisma.student.findUnique({ where: { userId } });
      if (!existingStudent) {
        const enrollmentYear = deriveEnrollmentYearFromNIM(nim);
        await prisma.student.create({
          data: {
            userId,
            enrollmentYear,
            skscompleted: 0,
          },
        });
        console.log(`🎓 Student linked: ${nama} (${nim})`);
      } else {
        skipped++;
      }
    } catch (err) {
      failed++;
      console.error(`❌ Gagal proses ${nama} (${nim}): ${err.message}`);
    }
  }

  console.log(`\n📦 Ringkasan import mahasiswa:`);
  console.log(`  ✅ Dibuat   : ${created}`);
  console.log(`  ♻️ Diupdate : ${updated}`);
  console.log(`  ⏭️ Dilewati: ${skipped}`);
  console.log(`  ❌ Gagal    : ${failed}`);
}

const overridePath = process.argv[2];

run(overridePath)
  .catch((err) => {
    console.error("❌ Error saat import mahasiswa:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Koneksi database ditutup.");
  });
