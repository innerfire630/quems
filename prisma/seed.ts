// =============================================================================
// prisma/seed.ts — Database seed script (Phase 1.1.3 stub)
// =============================================================================
// This file is the wiring owned by document 1.1.3. Substantive seed content
// (roles, permissions, super-admin user) is added in document 1.3.1.
// Run via `yarn prisma:seed`.
// =============================================================================

import { prisma } from '@/lib/db';

async function main(): Promise<void> {
  console.log('Seed script stub — substantive content is added in 1.3.1');

  // Trivial connectivity probe. Confirms the client is wired and the database
  // is reachable. Both counts should be zero in a freshly migrated database.
  const [userCount, roleCount] = await Promise.all([prisma.user.count(), prisma.role.count()]);

  console.log(`Database reachable. User count: ${userCount}, Role count: ${roleCount}`);
}

main()
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
