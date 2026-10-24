import { NextRequest, NextResponse } from 'next/server';
import { parseRawInput } from '@/lib/hygiene';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText = body.rawText || '';
    
    if (!rawText.trim()) {
      return NextResponse.json({ contacts: [], summary: { total: 0, valid: 0, disposable: 0, duplicate: 0, suppressed: 0 } });
    }

    const contacts = parseRawInput(rawText);

    const summary = {
      total: contacts.length,
      valid: contacts.filter(c => c.status === 'valid').length,
      disposable: contacts.filter(c => c.status === 'disposable').length,
      duplicate: contacts.filter(c => c.status === 'duplicate').length,
      suppressed: contacts.filter(c => c.status === 'suppressed').length,
      invalid: contacts.filter(c => c.status === 'invalid').length,
    };

    return NextResponse.json({ contacts, summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to parse contacts' }, { status: 500 });
  }
}
