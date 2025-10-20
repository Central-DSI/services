import prisma from '../src/config/prisma.js';

async function main() {
  console.log('🌱 Seeding Rubrik Seminar Hasil...');

  // Buat Rubrik Utama
  const rubric = await prisma.thesisSeminarRubric.create({
    data: {
      title: 'Rubrik Penilaian Seminar Hasil',
      createdBy: null, // bisa isi userId admin
      academicYearId: null, // isi kalau mau dikaitkan ke tahun akademik tertentu
    },
  });

  console.log(`✅ Rubrik utama dibuat: ${rubric.title}`);

  // Daftar detail rubrik
  const rubricDetails = [
    { indicator: 'Kesesuaian Solusi dengan Permasalahan', weight: 15 },
    { indicator: 'Business Process (Proses Bisnis)', weight: 10 },
    { indicator: 'Kualitas Perancangan Sistem', weight: 10 },
    { indicator: 'Entity Relationship Diagram (ERD)', weight: 15 },
    { indicator: 'Kesesuaian Fungsionalitas Sistem', weight: 15 },
    { indicator: 'Hasil Pengujian Sistem', weight: 10 },
    { indicator: 'Konsistensi antar Bab Laporan', weight: 10 },
    { indicator: 'Kemampuan Presentasi Mahasiswa', weight: 15 },
  ];

  // Insert semua detail ke tabel ThesisSeminarRubricDetail
  await prisma.thesisSeminarRubricDetail.createMany({
    data: rubricDetails.map((d) => ({
      rubricId: rubric.id,
      indicator: d.indicator,
      weight: d.weight,
    })),
  });

  console.log(`✅ ${rubricDetails.length} detail rubrik berhasil ditambahkan.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🌸 Seeding selesai.');
  })
  .catch(async (e) => {
    console.error('❌ Error saat seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
