import "dotenv/config";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

function cleanStr(v) {
  if (v == null) return "";
  return String(v)
    .replace(/[\u00A0\u200B]/g, " ") // NBSP/ZWSP to space
    .replace(/^\s*"|"\s*$/g, "") // trim surrounding quotes
    .replace(/\s+/g, " ") // collapse spaces
    .trim();
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
          row[key] = data[k] != null ? cleanStr(data[k]) : "";
        }
        rows.push(row);
      })
      .on("end", () => resolve(rows))
      .on("error", (err) => reject(err));
  });
}

function mapScienceGroupName(raw) {
  const name = cleanStr(raw).toLowerCase();
  const mapping = new Map([
    ["rekayasa data dan business intelligence", "Rekayasa Data dan Business Intelligence"],
    ["system development", "System Development"],
    ["sistem development", "System Development"],
    ["tata kelola dan infrastruktur teknologi informasi", "Tata Kelola dan Infrastruktur Teknologi Informasi"],
    ["system enterprise", "Sistem Enterprise"],
    ["sistem enterprise", "Sistem Enterprise"],
  ]);
  return mapping.get(name) || cleanStr(raw);
}

function normalizeRoleName(raw) {
  const v = cleanStr(raw).toLowerCase().replace(/\s+/g, " ");
  if (!v) return null;
  // Preserve numbered supervisor roles
  if (v === "pembimbing1" || v === "pembimbing 1") return "pembimbing1";
  if (v === "pembimbing2" || v === "pembimbing 2") return "pembimbing2";
  // If generic 'pembimbing' is provided, default to pembimbing1 (warn once per run is optional)
  if (v === "pembimbing") {
    return "pembimbing1";
  }
  if (v === "penguji") return "penguji";
  // Canonicalize secretary dept role to 'sekdep' (accept a few variants)
  if (v === "sekdep" || v === "sekretaris departemen" || v === "sekretaris_departemen") return "sekdep";
  if (v === "kadep") return "kadep";
  if (v === "gkm") return "gkm"; // will be created if not exists
  return v; // fallback to given string
}

function parseRoles(raw) {
  if (!raw) return [];
  const tokens = String(raw)
    .split(",")
    .map((t) => normalizeRoleName(t))
    .filter((t) => t && t.length > 0);
  // dedupe while preserving order
  const seen = new Set();
  const result = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      result.push(t);
    }
  }
  return result;
}

async function getOrCreateRole(name) {
  let role = await prisma.userRole.findFirst({ where: { name } });
  if (!role) {
    role = await prisma.userRole.create({ data: { name } });
    console.log(`🆕 userRole "${name}" dibuat`);
  }
  return role;
}

async function getOrCreateScienceGroup(name) {
  const fixed = mapScienceGroupName(name);
  let sg = await prisma.scienceGroup.findFirst({ where: { name: fixed } });
  if (!sg) {
    sg = await prisma.scienceGroup.create({ data: { name: fixed } });
    console.log(`🧪 ScienceGroup dibuat: ${fixed}`);
  }
  return sg;
}

async function ensureRoleForUser(userId, roleId) {
  const hasRole = await prisma.userHasRole.findFirst({
    where: { userId, roleId },
    select: { userId: true },
  });
  if (!hasRole) {
    await prisma.userHasRole.create({
      data: {
        user: { connect: { id: userId } },
        role: { connect: { id: roleId } },
        status: "active",
      },
    });
    return true;
  }
  return false;
}

async function run(fileOverride) {
  const filePath =
    fileOverride && fileOverride.trim().length > 0
      ? path.resolve(fileOverride)
      : path.join(process.cwd(), "data", "DosenDSI.csv");

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File CSV tidak ditemukan: ${filePath}`);
    process.exit(1);
  }

  console.log(`📥 Membaca CSV: ${filePath}`);
  const rows = await readCsv(filePath);
  console.log(`📊 Total data dibaca: ${rows.length}`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const nip = cleanStr(row.nip || row.NIP || "");
    const name = cleanStr(row.nama || row.name || "");
    const email = cleanStr(row.email || "").toLowerCase();
    const plainPassword = cleanStr(row.password || "password123");
  const sgName = cleanStr(row.sciencegroup || row["science group"] || row.group || "");
  const rolesRaw = cleanStr(row.roles || row.role || "");
  const roleNames = parseRoles(rolesRaw);

    if (!nip || !email) {
      skipped++;
      console.warn(`⚠️ Skip baris karena nip/email kosong: ${JSON.stringify(row)}`);
      continue;
    }

    try {
      const sg = sgName ? await getOrCreateScienceGroup(sgName) : null;
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      const existing = await prisma.user.findFirst({
        where: { OR: [{ identityNumber: nip }, { email }] },
        select: { id: true },
      });

      let userId;
      if (!existing) {
        const user = await prisma.user.create({
          data: {
            fullName: name,
            identityNumber: nip,
            identityType: "NIP",
            email,
            password: passwordHash,
            isVerified: true,
          },
        });
        userId = user.id;
        created++;
        console.log(`✅ Created user (lecturer): ${name} (${nip})`);
      } else {
        userId = existing.id;
      }

      // Ensure roles from CSV
      let rolesAdded = 0;
      for (const rn of roleNames) {
        const role = await getOrCreateRole(rn);
        const added = await ensureRoleForUser(userId, role.id);
        if (added) rolesAdded++;
      }

      // Ensure lecturer row
      const existingLect = await prisma.lecturer.findUnique({
        where: { userId: userId },
        select: { id: true, scienceGroupId: true },
      });

      if (!existingLect) {
        await prisma.lecturer.create({
          data: {
            user: { connect: { id: userId } },
            ...(sg ? { scienceGroup: { connect: { id: sg.id } } } : {}),
          },
        });
        if (!existing) {
          // already counted as created
        } else {
          updated++;
        }
        console.log(`🧑‍🏫 Lecturer linked: ${name} (${nip})${sg ? ` -> ${sg.name}` : ""}`);
      } else {
        // Update science group if provided and different
        if (sg && existingLect.scienceGroupId !== sg.id) {
          await prisma.lecturer.update({
            where: { userId: userId },
            data: { scienceGroupId: sg.id },
          });
          updated++;
          console.log(`🔁 Updated scienceGroup for ${name} -> ${sg.name}`);
        } else if (rolesAdded > 0) {
          updated++;
        } else if (!existing) {
          // already counted
        } else {
          skipped++;
        }
      }
    } catch (err) {
      failed++;
      console.error(`❌ Gagal proses ${name} (${nip}): ${err.message}`);
    }
  }

  console.log(`\n📦 Ringkasan import dosen:`);
  console.log(`  ✅ Dibuat   : ${created}`);
  console.log(`  ♻️ Diupdate : ${updated}`);
  console.log(`  ⏭️ Dilewati: ${skipped}`);
  console.log(`  ❌ Gagal    : ${failed}`);
}

const overridePath = process.argv[2];

run(overridePath)
  .catch((err) => {
    console.error("❌ Error saat import dosen:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Koneksi database ditutup.");
  });
