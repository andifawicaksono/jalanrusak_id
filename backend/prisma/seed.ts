import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Data Role ────────────────────────────────────────────────────

const ROLES = [
  {
    name: 'PUBLIC',
    displayName: 'Pelapor',
    description: 'Pengguna umum yang dapat membuat dan melihat laporan kerusakan jalan',
  },
  {
    name: 'VERIFIER',
    displayName: 'Admin Verifikator',
    description: 'Petugas yang dapat memverifikasi laporan (PENDING → VERIFIED) dan menolak laporan',
  },
  {
    name: 'FIELD_VERIFIER',
    displayName: 'Verifikator Lapangan',
    description: 'Petugas lapangan yang menangani perbaikan jalan — dapat mengubah status ke IN_PROGRESS dan RESOLVED dengan bukti foto',
  },
  {
    name: 'ADMIN',
    displayName: 'Super Admin',
    description: 'Administrator penuh dengan akses ke seluruh fitur dan manajemen pengguna',
  },
] as const;

// ─── Main Seed ────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding roles...');

  // Upsert semua role (idempoten — aman dijalankan berulang kali)
  for (const roleData of ROLES) {
    const role = await prisma.appRole.upsert({
      where: { name: roleData.name },
      update: {
        displayName: roleData.displayName,
        description: roleData.description,
      },
      create: roleData,
    });
    console.log(`  ✓ Role "${role.displayName}" (${role.name}) — ID: ${role.id}`);
  }

  // Sinkronisasi role_id untuk user yang belum punya
  console.log('\n🔗 Sinkronisasi role_id pengguna...');

  const allRoles = await prisma.appRole.findMany();
  const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));

  const usersWithoutRoleId = await prisma.user.findMany({
    where: { roleId: null },
    select: { id: true, role: true, email: true },
  });

  if (usersWithoutRoleId.length === 0) {
    console.log('  ✓ Semua pengguna sudah memiliki role_id');
  } else {
    let syncedCount = 0;
    for (const user of usersWithoutRoleId) {
      // Gunakan role enum value user sebagai key (PUBLIC/VERIFIER/ADMIN)
      const roleId = user.role ? roleMap.get(user.role) : roleMap.get('PUBLIC');
      if (roleId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId },
        });
        syncedCount++;
      }
    }
    console.log(`  ✓ ${syncedCount} pengguna berhasil disinkronisasi`);
  }

  console.log('\n✅ Seed selesai!');
}

// ─── Run ──────────────────────────────────────────────────────────

main()
  .catch((err) => {
    console.error('❌ Seed gagal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
