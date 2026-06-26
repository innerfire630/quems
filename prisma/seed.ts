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
  ROLE_SUPER_ADMIN,
  PERMISSION_DESCRIPTIONS,
} from '@/lib/permissions';
import type { Permission, Role } from '@/lib/permissions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

async function seedSuperAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  let user = await prisma.user.findUnique({ where: { email: DEFAULT_EMAIL } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEFAULT_EMAIL,
        name: 'Default Super Admin',
        password: passwordHash,
        status: 'ACTIVE',
      },
    });
  } else {
    // Update existing user password & name (not email — operator may have changed it)
    user = await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash, name: 'Default Super Admin' },
    });
  }

  // Assign SUPER_ADMIN role
  const superAdminRole = await prisma.role.findUnique({
    where: { name: ROLE_SUPER_ADMIN },
  });
  if (!superAdminRole) {
    throw new Error(`SUPER_ADMIN role not found in DB — ensure seedRoles() ran first.`);
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: user.id, roleId: superAdminRole.id },
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
    `${yellow}${bold}║  SECURITY WARNING — Default super-admin credential detected    ║${reset}`,
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

  // 4. Default super-admin user
  console.log('▶ Seeding default super-admin user...');
  await seedSuperAdmin();

  // 5. Default KioskConfig
  console.log('▶ Seeding default kiosk configuration...');
  await seedKioskConfig();

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
