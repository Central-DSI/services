import prisma from "../src/config/prisma.js";

const COMPONENTS = [
  {
    name: "Perancangan (Project)",
    description:
      "Apakah perancangan aplikasi mahasiswa sudah menerapkan proses bisnis yang benar serta arsitektur yang cocok.",
  },
  {
    name: "Bab 4 (Laporan)",
    description: "Reporting perancangan project sudah tertulis dengan lengkap dan rapi di laporan.",
  },
  {
    name: "Implementasi (Project)",
    description:
      "Apakah project tugas akhir mahasiswa sudah diimplementasikan dengan benar mengikuti perancangan yang direncanakan.",
  },
  {
    name: "Testing (Project)",
    description:
      "Apakah hasil testing project tugas akhir mahasiswa sudah mencapai solusi yang diharapkan pada tahap perancangan.",
  },
  {
    name: "Bab 5 (Laporan)",
    description:
      "Reporting implementasi dan testing project mahasiswa sudah ditulis dan didokumentasi dengan lengkap dan rapi di laporan.",
  },
  {
    name: "Bab 6 (Laporan)",
    description: "Reporting kesimpulan dari hasil penelitian sudah terdokumentasi dengan lengkap.",
  },
  {
    name: "Validasi (Laporan & Project)",
    description:
      "Apakah keseluruhan project dan report sudah benar-benar selesai dan layak untuk seminar hasil.",
  },
];

async function main() {
  console.log("🌱 Seeding ThesisProgressComponent...");

  const existing = await prisma.thesisProgressComponent.findMany({ select: { name: true } });
  const existingSet = new Set(existing.map((e) => (e.name || "").trim().toLowerCase()));

  const toCreate = COMPONENTS.filter(
    (c) => !existingSet.has(String(c.name).trim().toLowerCase())
  );

  if (toCreate.length) {
    await prisma.thesisProgressComponent.createMany({ data: toCreate });
  }

  console.log(
    `✅ ThesisProgressComponent: existing=${existing.length}, created=${toCreate.length}`
  );
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
