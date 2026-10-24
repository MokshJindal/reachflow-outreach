import { Contact } from '../types';

// Common disposable email domains to filter out
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'sharklasers.com', 'yopmail.com', 'throwawaymail.com', 'getairmail.com',
  'dispostable.com', 'trashmail.com', 'fakeinbox.com', 'maildrop.cc',
  'inboxkitten.com', 'temp-mail.org', 'mytemp.email', 'crazymailing.com',
  'mohmal.com', 'tempr.email', 'disposablemail.com', 'emailondeck.com',
  'generator.email', 'nada.ltd', 'burnermail.io'
]);

// Generic role-based prefix filter for cold outreach
const ROLE_PREFIXES = new Set([
  'admin', 'administrator', 'support', 'billing', 'finance',
  'sales', 'jobs', 'careers', 'marketing', 'info', 'contact',
  'office', 'team', 'help', 'noreply', 'no-reply', 'press'
]);

export function validateEmailSyntax(email: string): boolean {
  if (!email || email.length > 254) return false;
  // RFC 5322 simplified regex
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email);
}

export function sanitizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  // Strip whitespace, dashes, parens
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (!cleaned) return undefined;
  // Ensure plus prefix for international standard
  if (!cleaned.startsWith('+')) {
    // If it's a 10-digit Indian number without country code, add +91
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return `+${cleaned}`;
  }
  return cleaned;
}

export function parseRawInput(rawText: string): Contact[] {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const seenEmails = new Set<string>();
  const contacts: Contact[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Support multiple formats:
    // 1. "john@company.com"
    // 2. "John Doe <john@company.com>"
    // 3. "john@company.com, John, Doe, Acme Corp, +1234567890"
    // 4. TSV or semicolon separated
    let email = '';
    let firstName = '';
    let lastName = '';
    let company = '';
    let phone = '';

    if (line.includes('<') && line.includes('>')) {
      const match = line.match(/(.*?)\s*<([^>]+)>/);
      if (match) {
        const fullName = match[1].trim();
        email = match[2].trim().toLowerCase();
        const parts = fullName.split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }
    } else if (line.includes(',') || line.includes('\t') || line.includes(';')) {
      const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
      const parts = line.split(delimiter).map(p => p.trim());
      
      // Check which column has the @
      const emailIdx = parts.findIndex(p => p.includes('@'));
      if (emailIdx !== -1) {
        email = parts[emailIdx].toLowerCase();
        // Assign other fields heuristically
        const otherParts = parts.filter((_, idx) => idx !== emailIdx);
        if (otherParts.length >= 1) firstName = otherParts[0];
        if (otherParts.length >= 2) lastName = otherParts[1];
        if (otherParts.length >= 3) company = otherParts[2];
        if (otherParts.length >= 4) phone = otherParts[3];
        // If phone is in otherParts
        for (const part of otherParts) {
          if (part.startsWith('+') || /^\d{10,14}$/.test(part.replace(/[\s\-]/g, ''))) {
            phone = part;
          }
        }
      }
    } else {
      // Just single email (or email and phone)
      const tokens = line.split(/\s+/);
      const emailToken = tokens.find(t => t.includes('@'));
      if (emailToken) {
        email = emailToken.toLowerCase();
        const phoneToken = tokens.find(t => t.startsWith('+') || /^\d{10,14}$/.test(t));
        if (phoneToken) phone = phoneToken;
      }
    }

    if (!email) continue;

    // Check hygiene
    let status: Contact['status'] = 'valid';
    let statusReason = '';

    if (!validateEmailSyntax(email)) {
      status = 'invalid';
      statusReason = 'Invalid email syntax (RFC 5322)';
    } else if (seenEmails.has(email)) {
      status = 'duplicate';
      statusReason = 'Duplicate in current batch';
    } else {
      const [localPart, domain] = email.split('@');
      if (DISPOSABLE_DOMAINS.has(domain)) {
        status = 'disposable';
        statusReason = `Disposable/temporary domain (${domain})`;
      } else if (ROLE_PREFIXES.has(localPart)) {
        status = 'suppressed';
        statusReason = `Generic role mailbox (${localPart}@)`;
      }
    }

    seenEmails.add(email);

    contacts.push({
      id: `cnt_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      email,
      phone: sanitizePhone(phone),
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      company: company || undefined,
      status,
      statusReason: statusReason || undefined,
    });
  }

  return contacts;
}
