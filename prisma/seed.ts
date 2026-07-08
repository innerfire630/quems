// =============================================================================
// prisma/seed.ts — RBAC database seed (Document 1.3.1)
// =============================================================================
// Idempotent seed: can be re-run safely without creating duplicates.
// Populates permissions, roles, role-permission mappings, and the default
// super-admin user. Run via `yarn prisma:seed`.
//
// References: Master Plan §10.4 (RBAC Permission List)
// =============================================================================

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import {
  ALL_PERMISSIONS,
  ALL_ROLES,
  ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  ROLE_ADMIN,
  PERMISSION_DESCRIPTIONS,
} from '@/lib/permissions';
import type { Permission, Role } from '@/lib/permissions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_USERNAME = 'admin';
const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'Admin@123';
const BCRYPT_ROUNDS = 10;

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

/** Extract module from permission string (e.g. "user:manage" → "user"). */
function moduleFromPermission(p: Permission): string {
  return p.split(':')[0] ?? 'unknown';
}

async function seedPermissions(): Promise<number> {
  let count = 0;
  for (const name of ALL_PERMISSIONS) {
    const moduleName = moduleFromPermission(name);
    const description = PERMISSION_DESCRIPTIONS[name] ?? `${name} permission`;
    await prisma.permission.upsert({
      where: { name },
      update: { description, module: moduleName },
      create: {
        name,
        displayName: name,
        description,
        module: moduleName,
      },
    });
    count++;
  }
  return count;
}

async function seedRoles(): Promise<number> {
  let count = 0;
  for (const name of ALL_ROLES) {
    const description = ROLE_DESCRIPTIONS[name as Role] ?? `${name} role`;
    await prisma.role.upsert({
      where: { name },
      update: { description, isSystem: true },
      create: {
        name,
        displayName: name,
        description,
        isSystem: true,
      },
    });
    count++;
  }
  return count;
}

async function seedRolePermissions(): Promise<{ created: number; deleted: number }> {
  let created = 0;
  let deleted = 0;

  for (const roleName of ALL_ROLES) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.warn(`  ⚠ Role "${roleName}" not found in DB — skipping mappings.`);
      continue;
    }

    const expectedPermissions = ROLE_PERMISSIONS[roleName] ?? [];

    // Create missing mappings
    for (const permName of expectedPermissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: permName },
      });
      if (!permission) {
        console.warn(`  ⚠ Permission "${permName}" not found in DB — skipping.`);
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {}, // no-op — mappings are immutable
        create: { roleId: role.id, permissionId: permission.id },
      });
      created++;
    }

    // Remove stale mappings (permissions no longer in the role's list)
    const expectedSet = new Set(expectedPermissions);
    const existingMappings = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      include: { permission: true },
    });

    for (const mapping of existingMappings) {
      if (!expectedSet.has(mapping.permission.name as Permission)) {
        await prisma.rolePermission.delete({ where: { id: mapping.id } });
        deleted++;
      }
    }
  }

  return { created, deleted };
}

async function seedAdminUser(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  let user = await prisma.user.findUnique({ where: { username: DEFAULT_USERNAME } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        username: DEFAULT_USERNAME,
        email: DEFAULT_EMAIL,
        name: 'Default Admin',
        password: passwordHash,
        status: 'ACTIVE',
      },
    });
  } else {
    // Update existing user password & name (not username — operator may have changed it)
    user = await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash, name: 'Default Admin' },
    });
  }

  // Assign ADMIN role
  const adminRole = await prisma.role.findUnique({
    where: { name: ROLE_ADMIN },
  });
  if (!adminRole) {
    throw new Error(`ADMIN role not found in DB — ensure seedRoles() ran first.`);
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  });

  // ---------------------------------------------------------------------------
  // Security warning — default password in use
  // ---------------------------------------------------------------------------
  const yellow = '\x1b[33m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';

  console.warn('');
  console.warn(
    `${yellow}${bold}╔══════════════════════════════════════════════════════════════════╗${reset}`,
  );
  console.warn(
    `${yellow}${bold}║  SECURITY WARNING — Default admin credential detected           ║${reset}`,
  );
  console.warn(
    `${yellow}${bold}╠══════════════════════════════════════════════════════════════════╣${reset}`,
  );
  console.warn(`${yellow}║  Email:    ${DEFAULT_EMAIL.padEnd(54)}║${reset}`);
  console.warn(`${yellow}║  Password: ${DEFAULT_PASSWORD.padEnd(54)}║${reset}`);
  console.warn(
    `${yellow}╠══════════════════════════════════════════════════════════════════╣${reset}`,
  );
  console.warn(
    `${yellow}║  CHANGE THIS PASSWORD IMMEDIATELY in any non-local environment. ║${reset}`,
  );
  console.warn(
    `${yellow}║  The default credential is for local development only.          ║${reset}`,
  );
  console.warn(
    `${yellow}║  Use the User Management page (built in 1.3.3) to change it.    ║${reset}`,
  );
  console.warn(
    `${yellow}${bold}╚══════════════════════════════════════════════════════════════════╝${reset}`,
  );
  console.warn('');
}

// ---------------------------------------------------------------------------
// Kiosk config seed
// ---------------------------------------------------------------------------

async function seedKioskConfig(): Promise<void> {
  const existing = await prisma.kioskConfig.findFirst({
    where: { isDefault: true, isActive: true },
  });

  if (existing) {
    console.log('  Default kiosk config already exists — skipping.');
    return;
  }

  await prisma.kioskConfig.create({
    data: {
      name: 'Default Kiosk',
      isDefault: true,
      isActive: true,
      welcomeMessage: 'Welcome! Please select a service.',
      footerMessage: 'Please wait to be called.',
      autoResetSeconds: 30,
      showEstimatedWait: true,
    },
  });

  console.log('  Default kiosk config created.');
}

// ---------------------------------------------------------------------------
// Display board seed
// ---------------------------------------------------------------------------

async function seedDisplayBoard(): Promise<void> {
  const existing = await prisma.displayBoard.findFirst({
    where: { isDefault: true },
  });

  if (existing) {
    // Update the name if it's still the old default
    if (existing.name === 'Main Display') {
      await prisma.displayBoard.update({
        where: { id: existing.id },
        data: { name: 'Smart Queue' },
      });
      console.log('  Renamed default display board from "Main Display" to "Smart Queue".');
    }
    // Ensure maxDisplayedTickets is 5
    if (existing.maxDisplayedTickets !== 5) {
      await prisma.displayBoard.update({
        where: { id: existing.id },
        data: { maxDisplayedTickets: 5 },
      });
      console.log(
        '  Updated default display board maxDisplayedTickets from',
        existing.maxDisplayedTickets,
        'to 5.',
      );
    } else {
      console.log('  Default display board already exists with correct settings — skipping.');
    }
    return;
  }

  await prisma.displayBoard.create({
    data: {
      name: 'Smart Queue',
      isDefault: true,
      maxDisplayedTickets: 5,
      announcementEnabled: true,
      bellEnabled: true,
      ttsEnabled: true,
      ttsLanguage: 'en-US',
      ttsRate: 1.0,
      ttsPitch: 1.0,
      ttsVolume: 1.0,
      announcementTemplate: 'Ticket {number}, please proceed to {counter}',
      themeColor: null,
      logoUrl: null,
      customMessage: null,
    },
  });

  console.log('  Default display board created.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  RBAC Seed — Role & Permission Catalogue');
  console.log('═══════════════════════════════════════════');
  console.log('');

  // 1. Permissions
  console.log('▶ Seeding permissions...');
  const permCount = await seedPermissions();
  console.log(`  ${permCount} permissions upserted.`);

  // 2. Roles
  console.log('▶ Seeding roles...');
  const roleCount = await seedRoles();
  console.log(`  ${roleCount} roles upserted.`);

  // 3. Role-to-permission mappings
  console.log('▶ Seeding role-permission mappings...');
  const { created, deleted } = await seedRolePermissions();
  console.log(`  ${created} mappings created, ${deleted} stale mappings removed.`);

  // 4. Default admin user
  console.log('▶ Seeding default admin user...');
  await seedAdminUser();

  // 5. Default KioskConfig
  console.log('▶ Seeding default kiosk configuration...');
  await seedKioskConfig();

  // 6. Default DisplayBoard
  console.log('▶ Seeding default display board...');
  await seedDisplayBoard();

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  RBAC seed completed successfully.');
  console.log('═══════════════════════════════════════════');
  console.log('');
}

main()
  .catch((error) => {
    console.error('');
    console.error('╔═══════════════════════════════════════════╗');
    console.error('║  RBAC SEED FAILED                        ║');
    console.error('╚═══════════════════════════════════════════╝');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
