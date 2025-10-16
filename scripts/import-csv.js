import "dotenv/config";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

function randSks(min = 70, max = 131) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ";" }))
      .on("data", (data) => {
        const row = {};
        for (const k of Object.keys(data)) {
          const key = k ? String(k).trim() : k;
          row[key] = data[k] != null ? String(data[k]).trim() : "";
        }
        rows.push(row);
      })
      .on("end", () => resolve(rows))
      .on("error", (err) => reject(err));
  });
}

async function getOrCreateStudentStatus(name = "Aktif") {
  let status = await prisma.studentStatus.findFirst({ where: { name } });
  if (!status) {
    status = await prisma.studentStatus.create({ data: { name } });
    console.log(`🆕 studentStatus "${name}" dibuat`);
  }
  return status;
}

async function getOrCreateRole(name = "student") {
  let role = await prisma.userRole.findFirst({ where: { name } });
  if (!role) {
    role = await prisma.userRole.create({ data: { name } });
    console.log(`🆕 userRole "${name}" dibuat`);
  }
  return role;
}

async function run(fileOverride) {
  const filePath =
    fileOverride && fileOverride.trim().length > 0
      ? path.resolve(fileOverride)
      : path.join(process.cwd(), "data", "dsi2022.csv");

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File CSV tidak ditemukan: ${filePath}`);
    process.exit(1);
  }

  console.log(`📥 Membaca CSV: ${filePath}`);
  const rows = await readCsv(filePath);
  console.log(`📊 Total data dibaca: ${rows.length}`);

  const activeStatus = await getOrCreateStudentStatus("Aktif");
  const studentRole = await getOrCreateRole("student");

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const nim = (row.nim || row.NIM || "").trim();
    const name = row.nama || row.nama_mahasiswa || row.name || "";
    const email = (row.email || "").toLowerCase();
    const plainPassword = row.password || nim || "password123";
    const angkatan = parseInt(row.angkatan || row.year || "", 10) || 2022;

    if (!nim || !email) {
      skipped++;
      console.warn(`⚠️ Skip baris karena nim/email kosong: ${JSON.stringify(row)}`);
      continue;
    }

    const exists = await prisma.user.findFirst({
      where: { OR: [{ identityNumber: nim }, { email }] },
      select: { id: true },
    });

    if (exists) {
      skipped++;
      console.warn(`⏭️ User sudah ada, skip: ${nim} / ${email}`);
      continue;
    }

    try {
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      const phoneNumber = row.phoneNumber || `08${Math.floor(100000000 + Math.random() * 900000000)}`;

      const user = await prisma.user.create({
        data: {
          fullName: name,
          identityNumber: nim,
          identityType: "NIM",
          email,
          password: passwordHash,
          phoneNumber,
          isVerified: true,
          userHasRoles: {
            create: {
              role: { connect: { id: studentRole.id } },
              status: "active",
            },
          },
        },
      });

      await prisma.student.create({
        data: {
          userId: user.id,
          studentStatusId: activeStatus.id,
          enrollmentYear: angkatan,
          skscompleted: randSks(70, 131),
        },
      });

      success++;
      console.log(`✅ ${name} (${nim}) berhasil dimigrasi`);
    } catch (err) {
      failed++;
      console.error(`❌ Gagal insert ${name} (${nim}): ${err.message}`);
    }
  }

  console.log(`\n📦 Ringkasan migrasi:`);
  console.log(`  ✅ Berhasil : ${success}`);
  console.log(`  ⏭️ Dilewati: ${skipped}`);
  console.log(`  ❌ Gagal    : ${failed}`);
}

const overridePath = process.argv[2];

run(overridePath)
  .catch((err) => {
    console.error("❌ Error saat migrasi:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Koneksi database ditutup.");
  });