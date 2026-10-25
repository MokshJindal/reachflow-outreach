import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { AppSettings, Contact, SendLogItem, OutreachChannel } from '../types';

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
  const host = settings.smtpHost || process.env.SMTP_HOST || '';
  const user = settings.smtpUser || process.env.SMTP_USER || '';
  const pass = settings.smtpPass || process.env.SMTP_PASS || '';
  const port = settings.smtpPort || parseInt(process.env.SMTP_PORT || '465') || 465;
  const secure = settings.smtpSecure ?? (process.env.SMTP_SECURE === 'true' || port === 465);
  const fromName = settings.fromName || process.env.FROM_NAME || 'Outreach Team';
  const fromEmail = settings.fromEmail || process.env.FROM_EMAIL || user;
  const replyTo = settings.replyTo || process.env.REPLY_TO || fromEmail;

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

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toName ? `"${toName}" <${toEmail}>` : toEmail,
      replyTo: replyTo,
      subject: subject,
      text: body,
      html: body.includes('<') && body.includes('>') ? body : body.replace(/\n/g, '<br />'),
      headers: {
        'X-Mailer': 'ReachFlow-Enterprise-v1.0',
        'List-Unsubscribe': `<mailto:${replyTo}?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    });

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
  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
    return { ok: false, message: 'Host, Username, and Password are required.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpSecure || false,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
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
