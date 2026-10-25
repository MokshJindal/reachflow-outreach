import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'reachflow-config.json');

export async function GET() {
  let fileSettings: Record<string, any> = {};
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fileSettings = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not read reachflow-config.json:', e);
  }

  // Read existing env variables or config file
  const envSettings = {
    aiEnabled: fileSettings.aiEnabled ?? true,
    anthropicApiKey: fileSettings.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: fileSettings.anthropicModel || process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
    variationIntensity: fileSettings.variationIntensity || 'moderate',
    emailConfigured: !!(fileSettings.smtpHost || (process.env.SMTP_HOST && process.env.SMTP_USER)),
    emailProvider: fileSettings.emailProvider || (process.env.EMAIL_PROVIDER as any) || 'zoho',
    smtpHost: fileSettings.smtpHost || process.env.SMTP_HOST || 'smtp.zoho.in',
    smtpPort: parseInt(fileSettings.smtpPort || process.env.SMTP_PORT || '465') || 465,
    smtpSecure: fileSettings.smtpSecure ?? (process.env.SMTP_SECURE === 'true' || true),
    smtpUser: fileSettings.smtpUser || process.env.SMTP_USER || '',
    smtpPass: fileSettings.smtpPass || process.env.SMTP_PASS || '',
    fromName: fileSettings.fromName || process.env.FROM_NAME || 'Prearn Collaborations Team',
    fromEmail: fileSettings.fromEmail || process.env.FROM_EMAIL || '',
    replyTo: fileSettings.replyTo || process.env.REPLY_TO || '',
    whatsappConfigured: true,
    whatsappProvider: fileSettings.whatsappProvider || (process.env.WHATSAPP_PROVIDER as any) || 'personal_direct',
    twilioAccountSid: fileSettings.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: fileSettings.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || '',
    twilioWhatsAppNumber: fileSettings.twilioWhatsAppNumber || process.env.TWILIO_WHATSAPP_NUMBER || '',
    sendDelaySeconds: parseInt(fileSettings.sendDelaySeconds || process.env.SEND_DELAY_SECONDS || '3') || 3,
    dailyLimit: parseInt(fileSettings.dailyLimit || process.env.DAILY_LIMIT || '500') || 500,
    stopOnHighBounce: fileSettings.stopOnHighBounce ?? (process.env.STOP_ON_HIGH_BOUNCE !== 'false'),
  };

  return NextResponse.json({ settings: envSettings });
}

export async function POST(req: NextRequest) {
  try {
    const newSettings = await req.json();
    
    // Save to persistent reachflow-config.json
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(newSettings, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not write reachflow-config.json:', e);
    }

    // Update in-memory process.env for current running server instance
    if (newSettings.smtpHost) process.env.SMTP_HOST = newSettings.smtpHost;
    if (newSettings.smtpPort) process.env.SMTP_PORT = String(newSettings.smtpPort);
    if (newSettings.smtpSecure !== undefined) process.env.SMTP_SECURE = String(newSettings.smtpSecure);
    if (newSettings.smtpUser) process.env.SMTP_USER = newSettings.smtpUser;
    if (newSettings.smtpPass) process.env.SMTP_PASS = newSettings.smtpPass;
    if (newSettings.fromName) process.env.FROM_NAME = newSettings.fromName;
    if (newSettings.fromEmail) process.env.FROM_EMAIL = newSettings.fromEmail;
    if (newSettings.replyTo) process.env.REPLY_TO = newSettings.replyTo;
    if (newSettings.anthropicApiKey) process.env.ANTHROPIC_API_KEY = newSettings.anthropicApiKey;

    // Format as .env.local content
    const envLines = [
      `# ReachFlow Outreach Environment Configuration (Updated: ${new Date().toISOString()})`,
      `ANTHROPIC_API_KEY=${newSettings.anthropicApiKey || ''}`,
      `ANTHROPIC_MODEL=${newSettings.anthropicModel || 'claude-3-5-haiku-20241022'}`,
      `EMAIL_PROVIDER=${newSettings.emailProvider || 'zoho'}`,
      `SMTP_HOST=${newSettings.smtpHost || ''}`,
      `SMTP_PORT=${newSettings.smtpPort || 465}`,
      `SMTP_SECURE=${newSettings.smtpSecure ? 'true' : 'false'}`,
      `SMTP_USER=${newSettings.smtpUser || ''}`,
      `SMTP_PASS=${newSettings.smtpPass || ''}`,
      `FROM_NAME="${newSettings.fromName || 'Prearn Collaborations Team'}"`,
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

    try {
      const envPath = path.join(process.cwd(), '.env.local');
      fs.writeFileSync(envPath, envLines.join('\n'), 'utf-8');
    } catch (e) {
      console.warn('Could not write .env.local:', e);
    }

    return NextResponse.json({ ok: true, message: 'Settings saved and persisted successfully' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || 'Failed to save settings' }, { status: 500 });
  }
}
