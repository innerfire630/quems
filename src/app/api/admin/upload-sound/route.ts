// =============================================================================
// src/app/api/admin/upload-sound/route.ts — Sound file upload endpoint
// =============================================================================
// POST /api/admin/upload-sound
// Accepts a multipart/form-data file upload (audio/*), saves it to
// public/uploads/sounds/, and returns the filename for use in settings.
// =============================================================================

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { getServerSession } from '@/lib/auth';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'sounds');
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-wav'];

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
          message: `Invalid file type "${file.type}". Allowed: MP3, WAV, OGG`,
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
          message: `File too large (${(file.size / 1024).toFixed(0)} KB). Max 5 MB.`,
        },
      },
      { status: 422 },
    );
  }

  // Determine extension
  const extMap: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/ogg': '.ogg',
  };
  const ext = extMap[file.type] ?? '.mp3';

  // Generate unique filename
  const hash = randomBytes(6).toString('hex');
  const filename = `sound-${hash}${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return NextResponse.json({ success: true, data: { filename } });
}
