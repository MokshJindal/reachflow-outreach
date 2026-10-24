import { NextRequest, NextResponse } from 'next/server';
import { auditDeliverabilityWithClaude } from '@/lib/ai-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, bodyContent, apiKey } = body;

    const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    const audit = await auditDeliverabilityWithClaude(effectiveApiKey, subject || '', bodyContent || '');

    return NextResponse.json({ audit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Audit failed' }, { status: 500 });
  }
}
