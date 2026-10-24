import { NextRequest, NextResponse } from 'next/server';
import { generateVariationsWithClaude } from '@/lib/ai-engine';
import { Contact } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { subject, bodyContent, contacts, apiKey, model } = payload;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ variations: [] });
    }

    const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    const variations = await generateVariationsWithClaude(
      effectiveApiKey,
      model || 'claude-3-5-haiku-20241022',
      subject || '',
      bodyContent || '',
      contacts as Contact[]
    );

    return NextResponse.json({ variations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Variation failed' }, { status: 500 });
  }
}
