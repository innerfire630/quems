// =============================================================================
// src/app/api/admin/upload-logo/route.ts — Logo upload endpoint
// =============================================================================
// POST /api/admin/upload-logo
// Accepts a multipart/form-data file upload (image/*), saves it to
// public/uploads/logos/, and updates the system.logo_url setting.
// =============================================================================

import { NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidateTag } from 'next/cache';
import { SETTINGS_TAG } from '@/lib/cache-tags';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'logos');
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];

export async function POST(req: Request): Promise<Response> {
  // Auth + permission check
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  const permissions: string[] = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SYSTEM_CONFIGURE)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Missing permission' } },
      { status: 403 },
    );
  }

  // Parse form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid form data' } },
      { status: 422 },
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'No file provided' } },
      { status: 422 },
    );
  }

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid file type "${file.type}". Allowed: PNG, JPEG, SVG, WebP, GIF`,
        },
      },
      { status: 422 },
    );
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `File too large (${(file.size / 1024).toFixed(0)} KB). Max 2 MB.`,
        },
      },
      { status: 422 },
    );
  }

  // Determine extension
  const extMap: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/svg+xml': '.svg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  const ext = extMap[file.type] ?? '.png';

  // Clean up old logo files
  try {
    const existing = await readdir(UPLOAD_DIR);
    for (const f of existing) {
      if (f.startsWith('logo')) {
        await unlink(join(UPLOAD_DIR, f)).catch(() => {});
      }
    }
  } catch {
    // Directory may not exist yet — that's fine
  }

  // Save as logo.<ext> for a stable URL
  const filename = `logo${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const publicUrl = `/uploads/logos/${filename}`;

  // Update the setting
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'system.logo_url' },
    select: { id: true },
  });

  if (setting) {
    await prisma.systemSetting.update({
      where: { id: setting.id },
      data: { value: publicUrl, updatedById: session.user.userId },
    });
  }

  // Audit log — best effort
  try {
    await prisma.auditLog.create({
      data: {
        userId: session.user.userId,
        userDisplayName: session.user.name ?? null,
        action: 'SYSTEM_SETTING_CHANGED',
        entity: 'SystemSetting',
        entityId: setting?.id ?? 'system.logo_url',
        after: { key: 'system.logo_url', value: publicUrl },
      },
    });
  } catch {
    // Best effort
  }

  revalidateTag(SETTINGS_TAG, 'max');

  return NextResponse.json({ success: true, data: { url: publicUrl } });
}
