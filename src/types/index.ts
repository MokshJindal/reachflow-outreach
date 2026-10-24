export type OutreachChannel = 'email' | 'whatsapp' | 'both';

export type ContactStatus = 'valid' | 'invalid' | 'disposable' | 'duplicate' | 'suppressed';

export interface Contact {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  customFields?: Record<string, string>;
  status: ContactStatus;
  statusReason?: string;
}

export interface AppSettings {
  // AI Settings
  aiEnabled: boolean;
  anthropicApiKey: string;
  anthropicModel: string;
  variationIntensity: 'subtle' | 'moderate' | 'creative';
  
  // Email Configuration (SMTP / Gmail / SES / Resend)
  emailConfigured: boolean;
  emailProvider: 'smtp' | 'gmail' | 'ses' | 'resend';
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;

  // WhatsApp Configuration (Twilio)
  whatsappConfigured: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioWhatsAppNumber: string;

  // Sending Controls
  sendDelaySeconds: number; // Jitter interval
  dailyLimit: number;
  stopOnHighBounce: boolean;
}

export interface SendLogItem {
  id: string;
  timestamp: string;
  contactEmail: string;
  contactPhone?: string;
  contactName?: string;
  company?: string;
  channel: OutreachChannel;
  subjectSent?: string;
  bodySent?: string;
  whatsappSent?: string;
  status: 'sent' | 'failed' | 'simulated';
  errorDetails?: string;
  isAiVaried?: boolean;
}

export interface DeliverabilityAudit {
  riskScore: number; // 0-100 (0 = pristine, 100 = spam)
  verdict: 'safe' | 'moderate_risk' | 'high_risk' | 'critical';
  spamTriggerWords: string[];
  suggestions: string[];
  recommendations: string[];
}
