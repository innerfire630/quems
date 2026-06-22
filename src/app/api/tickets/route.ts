import { NextResponse } from 'next/server';

const BODY = {
  success: false,
  error: {
    code: 'NOT_IMPLEMENTED',
    message: 'This endpoint is scheduled for implementation in a later phase.',
  },
} as const;

export async function GET() {
  return NextResponse.json(BODY, { status: 501 });
}
