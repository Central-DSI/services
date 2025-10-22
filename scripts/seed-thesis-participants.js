import prisma from "../src/config/prisma.js";

function normalizeRoleName(s) {
  return String(s || "").toLowerCase().replace(/\s|_/g, "");
}

function pickDistinct(arr, count = 1) {
  if (!arr || arr.length === 0) return [];
  const copy = [...arr];
  // simple shuffle
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

async function getRoleIds() {
  const roles = await prisma.userRole.findMany({ select: { id: true, name: true } });
  const map = new Map();
  for (const r of roles) {
    map.set(normalizeRoleName(r.name), r.id);
  }
  // Support common variants
  const sup1Id = map.get("pembimbing1") || map.get("pembimbing01") || map.get("supervisor1") || null;
  const sup2Id = map.get("pembimbing2") || map.get("pembimbing02") || map.get("supervisor2") || null;
  return { sup1Id, sup2Id };
}

async function getEligibleLecturersByRole(roleId) {
  if (!roleId) return [];
  const lecturers = await prisma.lecturer.findMany({
    where: {
      user: {
        userHasRoles: { some: { roleId, status: "active" } },
      },
    },
    select: { id: true },
  });
  return lecturers.map((l) => l.id);
}

async function main() {
  console.log("\n🌱 Seeding ThesisParticipant (use existing data, do not duplicate)...");

  const { sup1Id, sup2Id } = await getRoleIds();
  if (!sup1Id && !sup2Id) {
    console.log("⚠️ No supervisor roles found (pembimbing1/pembimbing2). Aborting.");
    return;
  }

  const sup1Lecturers = await getEligibleLecturersByRole(sup1Id);
  const sup2Lecturers = await getEligibleLecturersByRole(sup2Id);

  // Fallback: if no eligible lecturers by role, allow any lecturers
  let anyLecturers = [];
  if (!sup1Lecturers.length || !sup2Lecturers.length) {
    const all = await prisma.lecturer.findMany({ select: { id: true } });
    anyLecturers = all.map((l) => l.id);
  }

  // Fetch theses; only fill if missing respective participant roles
  const theses = await prisma.thesis.findMany({ select: { id: true } });
  let createPayload = [];

  for (const t of theses) {
    const existing = await prisma.thesisParticipant.findMany({
      where: { thesisId: t.id },
      select: { lecturerId: true, roleId: true },
    });
    const hasRole = new Set(existing.map((e) => e.roleId));
    const usedLecturers = new Set(existing.map((e) => e.lecturerId));

    // Determine candidates per role
    if (sup1Id && !hasRole.has(sup1Id)) {
      const pool = sup1Lecturers.length ? sup1Lecturers : anyLecturers;
      const candidates = pool.filter((lid) => !usedLecturers.has(lid));
      const pick = pickDistinct(candidates, 1)[0];
      if (pick) {
        createPayload.push({ thesisId: t.id, lecturerId: pick, roleId: sup1Id });
        usedLecturers.add(pick);
      }
    }

    if (sup2Id && !hasRole.has(sup2Id)) {
      const pool = sup2Lecturers.length ? sup2Lecturers : anyLecturers;
      const candidates = pool.filter((lid) => !usedLecturers.has(lid));
      const pick = pickDistinct(candidates, 1)[0];
      if (pick) {
        createPayload.push({ thesisId: t.id, lecturerId: pick, roleId: sup2Id });
        usedLecturers.add(pick);
      }
    }

    // Batch insert per ~100 rows to avoid huge payloads
    if (createPayload.length >= 100) {
      await prisma.thesisParticipant.createMany({ data: createPayload });
      createPayload = [];
    }
  }

  if (createPayload.length) {
    await prisma.thesisParticipant.createMany({ data: createPayload });
  }

  console.log("✅ ThesisParticipant seeding completed.");
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
