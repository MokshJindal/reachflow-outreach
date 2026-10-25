import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // Read existing env variables or .env.local
  const envSettings = {
    aiEnabled: true,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
    variationIntensity: 'moderate',
    emailConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    emailProvider: (process.env.EMAIL_PROVIDER as any) || 'gmail',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '465') || 465,
    smtpSecure: process.env.SMTP_SECURE === 'true' || true,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    fromName: process.env.FROM_NAME || 'Outreach Team',
    fromEmail: process.env.FROM_EMAIL || '',
    replyTo: process.env.REPLY_TO || '',
    whatsappConfigured: true,
    whatsappProvider: (process.env.WHATSAPP_PROVIDER as any) || 'personal_direct',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
    sendDelaySeconds: parseInt(process.env.SEND_DELAY_SECONDS || '3') || 3,
    dailyLimit: parseInt(process.env.DAILY_LIMIT || '500') || 500,
    stopOnHighBounce: process.env.STOP_ON_HIGH_BOUNCE !== 'false',
  };

  return NextResponse.json({ settings: envSettings });
}

export async function POST(req: NextRequest) {
  try {
    const newSettings = await req.json();
    
    // Format as .env.local content
    const envLines = [
      `# ReachFlow Outreach Environment Configuration (Updated: ${new Date().toISOString()})`,
      `ANTHROPIC_API_KEY=${newSettings.anthropicApiKey || ''}`,
      `ANTHROPIC_MODEL=${newSettings.anthropicModel || 'claude-3-5-haiku-20241022'}`,
      `EMAIL_PROVIDER=${newSettings.emailProvider || 'gmail'}`,
      `SMTP_HOST=${newSettings.smtpHost || ''}`,
      `SMTP_PORT=${newSettings.smtpPort || 465}`,
      `SMTP_SECURE=${newSettings.smtpSecure ? 'true' : 'false'}`,
      `SMTP_USER=${newSettings.smtpUser || ''}`,
      `SMTP_PASS=${newSettings.smtpPass || ''}`,
      `FROM_NAME="${newSettings.fromName || 'Outreach Team'}"`,
      `FROM_EMAIL=${newSettings.fromEmail || ''}`,
      `REPLY_TO=${newSettings.replyTo || ''}`,
      `WHATSAPP_PROVIDER=${newSettings.whatsappProvider || 'personal_direct'}`,
      `TWILIO_ACCOUNT_SID=${newSettings.twilioAccountSid || ''}`,
      `TWILIO_AUTH_TOKEN=${newSettings.twilioAuthToken || ''}`,
      `TWILIO_WHATSAPP_NUMBER=${newSettings.twilioWhatsAppNumber || ''}`,
      `SEND_DELAY_SECONDS=${newSettings.sendDelaySeconds || 3}`,
      `DAILY_LIMIT=${newSettings.dailyLimit || 500}`,
      `STOP_ON_HIGH_BOUNCE=${newSettings.stopOnHighBounce ? 'true' : 'false'}`
    ];

    const envPath = path.join(process.cwd(), '.env.local');
    fs.writeFileSync(envPath, envLines.join('\n'), 'utf-8');

    return NextResponse.json({ ok: true, message: 'Settings saved to .env.local successfully' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || 'Failed to write .env.local' }, { status: 500 });
  }
}
