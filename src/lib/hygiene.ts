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
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email);
}

export function sanitizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (!cleaned) return undefined;
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return `+${cleaned}`;
  }
  return cleaned;
}

export function smartDomainToCompany(domain: string): string {
  if (!domain) return '';
  const genericHosts = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'proton.me', 'aol.com'];
  if (genericHosts.includes(domain.toLowerCase())) return '';
  
  const base = domain.split('.')[0];
  if (!base) return '';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function evaluateContactHygiene(email: string, seenEmails: Set<string>): { status: Contact['status']; reason?: string } {
  if (!validateEmailSyntax(email)) {
    return { status: 'invalid', reason: 'Invalid email syntax (RFC 5322)' };
  }
  if (seenEmails.has(email)) {
    return { status: 'duplicate', reason: 'Duplicate in current batch' };
  }
  const [localPart, domain] = email.split('@');
  if (DISPOSABLE_DOMAINS.has(domain.toLowerCase())) {
    return { status: 'disposable', reason: `Disposable temporary domain (${domain})` };
  }
  if (ROLE_PREFIXES.has(localPart.toLowerCase())) {
    return { status: 'suppressed', reason: `Generic role mailbox (${localPart}@)` };
  }
  return { status: 'valid' };
}

/**
 * Universal extractor: parses contacts from ANY free-form unstructured text (PDF, Word, Webpage, etc.)
 */
export function extractContactsFromUnstructuredText(text: string): Contact[] {
  if (!text) return [];

  // Match only clean, standard email addresses with standard TLDs
  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}\b/g;
  const matches = text.match(emailRegex) || [];
  
  const seenEmails = new Set<string>();
  const contacts: Contact[] = [];

  // Split into lines for contextual proximity extraction
  const lines = text.split(/\r?\n/);

  matches.forEach((rawEmail, index) => {
    const email = rawEmail.trim().toLowerCase();
    if (seenEmails.has(email)) return;

    // Validate TLD is alphabetic
    const domainPart = email.split('@')[1];
    if (!domainPart || !domainPart.includes('.')) return;
    const tld = domainPart.split('.').pop();
    if (!tld || !/^[a-zA-Z]{2,10}$/.test(tld)) return;

    // Find the line containing this email for context
    const lineIndex = lines.findIndex(l => l.includes(rawEmail));
    const currentLine = lineIndex !== -1 ? lines[lineIndex] : '';
    const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : '';

    let firstName = '';
    let lastName = '';
    let company = '';
    let phone = '';

    // Check for phone numbers on the same line or adjacent line
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+91[-.\s]?[6-9]\d{9}|[6-9]\d{9}/;
    const phoneMatch = currentLine.match(phoneRegex) || prevLine.match(phoneRegex);
    if (phoneMatch) {
      phone = phoneMatch[0];
    }

    // Check for formatted name: "John Doe <john@company.com>"
    if (currentLine.includes('<') && currentLine.includes('>')) {
      const nameMatch = currentLine.match(/(.*?)\s*<[^>]+>/);
      if (nameMatch) {
        const full = nameMatch[1].replace(/["']/g, '').trim();
        if (/^[A-Za-z\s.'-]{2,40}$/.test(full)) {
          const parts = full.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
      }
    } else {
      // Look for name before comma or tab: "John Doe, john@company.com"
      const parts = currentLine.split(/[,;\t]/).map(p => p.trim());
      const emailPartIdx = parts.findIndex(p => p.includes(rawEmail));
      if (emailPartIdx > 0) {
        const potentialName = parts[emailPartIdx - 1];
        if (potentialName && /^[A-Za-z\s.'-]{2,40}$/.test(potentialName)) {
          const nameParts = potentialName.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
      }
    }

    // If no first name found, check if email has "firstname.lastname@domain.com"
    if (!firstName) {
      const local = email.split('@')[0];
      if (local.includes('.') && !local.includes('+')) {
        const subparts = local.split('.');
        if (subparts.length === 2 && /^[a-zA-Z]{2,20}$/.test(subparts[0]) && /^[a-zA-Z]{2,20}$/.test(subparts[1])) {
          firstName = subparts[0].charAt(0).toUpperCase() + subparts[0].slice(1);
          lastName = subparts[1].charAt(0).toUpperCase() + subparts[1].slice(1);
        }
      }
    }

    // Infer company from domain or adjacent text
    company = smartDomainToCompany(domainPart);

    const hygiene = evaluateContactHygiene(email, seenEmails);
    seenEmails.add(email);

    contacts.push({
      id: `cnt_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      email,
      phone: sanitizePhone(phone),
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      company: company || undefined,
      status: hygiene.status,
      statusReason: hygiene.reason,
    });
  });

  return contacts;
}

export function parseRawInput(rawText: string): Contact[] {
  // If it's unstructured text without commas/tabs, use universal extractor
  if (!rawText.includes(',') && !rawText.includes('\t') && !rawText.includes(';')) {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const hasSingleEmails = lines.every(l => l.includes('@') && !l.includes(' '));
    if (!hasSingleEmails) {
      return extractContactsFromUnstructuredText(rawText);
    }
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const seenEmails = new Set<string>();
  const contacts: Contact[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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
      
      const emailIdx = parts.findIndex(p => p.includes('@'));
      if (emailIdx !== -1) {
        email = parts[emailIdx].toLowerCase();
        const otherParts = parts.filter((_, idx) => idx !== emailIdx);
        if (otherParts.length >= 1) firstName = otherParts[0];
        if (otherParts.length >= 2) lastName = otherParts[1];
        if (otherParts.length >= 3) company = otherParts[2];
        
        for (const part of otherParts) {
          if (part.startsWith('+') || /^\d{10,14}$/.test(part.replace(/[\s\-]/g, ''))) {
            phone = part;
          }
        }
      }
    } else {
      const tokens = line.split(/\s+/);
      const emailToken = tokens.find(t => t.includes('@'));
      if (emailToken) {
        email = emailToken.toLowerCase();
        const phoneToken = tokens.find(t => t.startsWith('+') || /^\d{10,14}$/.test(t));
        if (phoneToken) phone = phoneToken;
      }
    }

    if (!email) continue;

    if (!company && email.includes('@')) {
      company = smartDomainToCompany(email.split('@')[1]);
    }

    const hygiene = evaluateContactHygiene(email, seenEmails);
    seenEmails.add(email);

    contacts.push({
      id: `cnt_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      email,
      phone: sanitizePhone(phone),
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      company: company || undefined,
      status: hygiene.status,
      statusReason: hygiene.reason,
    });
  }

  return contacts;
}
