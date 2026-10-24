import { NextRequest, NextResponse } from 'next/server';
import { testSmtpConnection, testTwilioConnection } from '@/lib/dispatch-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, settings } = body;

    if (type === 'email') {
      const result = await testSmtpConnection(settings);
      return NextResponse.json(result);
    } else if (type === 'whatsapp') {
      const result = await testTwilioConnection(settings);
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, message: 'Invalid test type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || 'Verification error' }, { status: 500 });
  }
}
