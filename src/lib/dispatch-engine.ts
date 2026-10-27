import nodemailer from 'nodemailer';
import twilio from 'twilio';
import fs from 'fs';
import path from 'path';
import { AppSettings, Contact, SendLogItem, OutreachChannel } from '../types';

function getServerFallbackSettings(): Record<string, any> {
  try {
    const configPath = path.join(process.cwd(), 'reachflow-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return {};
}

export interface DispatchItem {
  contact: Contact;
  subject: string;
  body: string;
  whatsappText: string;
  channel: OutreachChannel;
  isAiVaried?: boolean;
}

export async function sendEmailMessage(
  settings: AppSettings,
  toEmail: string,
  toName: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fallback = getServerFallbackSettings();
  const host = settings.smtpHost || fallback.smtpHost || process.env.SMTP_HOST || '';
  const user = settings.smtpUser || fallback.smtpUser || process.env.SMTP_USER || '';
  const pass = settings.smtpPass || fallback.smtpPass || process.env.SMTP_PASS || '';
  const port = settings.smtpPort || fallback.smtpPort || parseInt(process.env.SMTP_PORT || '465') || 465;
  const secure = settings.smtpSecure ?? (fallback.smtpSecure ?? (process.env.SMTP_SECURE === 'true' || port === 465));
  const fromName = settings.fromName || fallback.fromName || process.env.FROM_NAME || 'Prearn Collaborations Team';
  const fromEmail = settings.fromEmail || fallback.fromEmail || process.env.FROM_EMAIL || user;
  const replyTo = settings.replyTo || fallback.replyTo || process.env.REPLY_TO || fromEmail;

  // If SMTP is not configured or user is in simulation/test mode
  if (!host || !user || !pass) {
    // Return simulated success
    return {
      success: true,
      messageId: `sim_email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      error: 'Simulated send (Configure SMTP credentials in Settings for live inbox delivery)'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const fromAddress = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    const isPrimaryInboxMode = (settings.emailDeliveryMode || fallback.emailDeliveryMode || 'primary_inbox') === 'primary_inbox';
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(body);

    const mailOptions: nodemailer.SendMailOptions = {
      from: fromAddress,
      to: toName ? `"${toName}" <${toEmail}>` : toEmail,
      replyTo: replyTo,
      subject: subject,
      text: body,
    };

    // If template has HTML tags, or if marketing mode, include HTML
    if (hasHtmlTags) {
      mailOptions.html = body;
    } else if (!isPrimaryInboxMode) {
      mailOptions.html = body.replace(/\n/g, '<br />');
    }
    // In Primary Inbox mode with plain text, we deliberately OMIT html to look 100% like a personal Apple Mail/Gmail send

    // Headers: ONLY add bulk unsubscribe headers in marketing mode.
    // Gmail AI places ANY email with List-Unsubscribe into the Promotions tab!
    if (!isPrimaryInboxMode) {
      mailOptions.headers = {
        'List-Unsubscribe': `<mailto:${replyTo}?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'SMTP delivery failed'
    };
  }
}

export async function sendWhatsAppMessage(
  settings: AppSettings,
  toPhone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!toPhone) {
    return { success: false, error: 'Recipient has no valid phone number' };
  }

  const accountSid = settings.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = settings.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || '';
  const fromNumber = settings.twilioWhatsAppNumber || process.env.TWILIO_WHATSAPP_NUMBER || '';

  // If Twilio is not configured
  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: true,
      messageId: `sim_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      error: 'Simulated WhatsApp send (Configure Twilio credentials in Settings for live dispatch)'
    };
  }

  try {
    const client = twilio(accountSid, authToken);
    
    // Ensure twilio format: whatsapp:+1234567890
    const formattedFrom = fromNumber.startsWith('whatsapp:')
      ? fromNumber
      : `whatsapp:${fromNumber}`;
    
    const formattedTo = toPhone.startsWith('whatsapp:')
      ? toPhone
      : `whatsapp:${toPhone}`;

    const res = await client.messages.create({
      from: formattedFrom,
      to: formattedTo,
      body: text,
    });

    return {
      success: true,
      messageId: res.sid
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Twilio WhatsApp delivery failed'
    };
  }
}

export async function testSmtpConnection(settings: Partial<AppSettings>): Promise<{ ok: boolean; message: string }> {
  const fallback = getServerFallbackSettings();
  const host = settings.smtpHost || fallback.smtpHost;
  const user = settings.smtpUser || fallback.smtpUser;
  const pass = settings.smtpPass || fallback.smtpPass;
  const port = settings.smtpPort || fallback.smtpPort || 465;
  const secure = settings.smtpSecure ?? (fallback.smtpSecure ?? (port === 465));

  if (!host || !user || !pass) {
    return { ok: false, message: 'Host, Username, and Password are required.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.verify();
    return { ok: true, message: 'SMTP credentials verified successfully! Connection established.' };
  } catch (err: any) {
    const rawMsg = err.message || '';
    if (rawMsg.includes('535') || rawMsg.toLowerCase().includes('authentication failed')) {
      if (settings.smtpHost?.includes('zoho')) {
        return { 
          ok: false, 
          message: 'Zoho login rejected (535 5.7.8). Fix: 1) Use a Zoho App Password (not your account login password), 2) Check if your account is on .in vs .com, 3) Ensure SMTP access is enabled in Zoho Mail settings.' 
        };
      }
      if (settings.smtpHost?.includes('gmail')) {
        return { 
          ok: false, 
          message: 'Google login rejected (535 5.7.8). Fix: Use a 16-character Google App Password (from myaccount.google.com/apppasswords), NOT your normal Google password.' 
        };
      }
      return {
        ok: false,
        message: 'Authentication failed (535 5.7.8). The mail server rejected your username or password. Please check your credentials or generate an App Password.'
      };
    }
    return { ok: false, message: `Connection failed: ${rawMsg || 'Unknown error'}` };
  }
}

export async function testTwilioConnection(settings: Partial<AppSettings>): Promise<{ ok: boolean; message: string }> {
  if (!settings.twilioAccountSid || !settings.twilioAuthToken) {
    return { ok: false, message: 'Account SID and Auth Token are required.' };
  }

  try {
    const client = twilio(settings.twilioAccountSid, settings.twilioAuthToken);
    const account = await client.api.v2010.accounts(settings.twilioAccountSid).fetch();
    return { ok: true, message: `Twilio verified successfully! Account status: ${account.status}` };
  } catch (err: any) {
    return { ok: false, message: `Twilio verification failed: ${err.message || 'Invalid SID or Token'}` };
  }
}
