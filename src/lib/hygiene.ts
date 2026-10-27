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
    // Role addresses (admin@, info@, sales@) are valid for outreach
    return { status: 'valid', reason: `Role mailbox (${localPart}@)` };
  }
  return { status: 'valid' };
}

// Technical, schema, and metadata domains that should never be treated as outreach leads
const IGNORED_SYSTEM_DOMAINS = new Set([
  'schema.org', 'w3.org', 'adobe.com', 'apache.org', 'xml.org',
  'openxmlformats.org', 'apple.com', 'microsoft.com', 'googleapis.com',
  'github.com', 'sentry.io', 'example.com', 'domain.com', 'yourdomain.com',
  'test.com', 'localhost', 'mycompany.com', 'company.com'
]);

// Non-name words: words that commonly appear before commas/emails in sentences
const NON_NAME_WORDS = new Set([
  'the', 'of', 'and', 'in', 'to', 'for', 'with', 'on', 'at', 'from', 'by', 'about',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'can', 'will', 'just', 'should', 'now', 'please', 'contact', 'email',
  'phone', 'mobile', 'details', 'website', 'table', 'page', 'report', 'document', 'system',
  'platform', 'overview', 'engine', 'service', 'services', 'solution', 'solutions', 'team',
  'product', 'products', 'send', 'mail', 'bulk', 'outreach', 'blueprint', 'guide',
  'user', 'admin', 'help', 'info', 'support', 'sales', 'reachflow', 'reach', 'flow',
  'copyright', 'rights', 'reserved', 'terms', 'privacy', 'policy', 'powered', 'version'
]);

function isValidHumanName(str: string): boolean {
  if (!str) return false;
  const cleaned = str.trim();
  if (cleaned.length < 2 || cleaned.length > 30) return false;
  // Must only contain letters, spaces, and optional hyphens/dots
  if (!/^[A-Za-z\s.'-]{2,30}$/.test(cleaned)) return false;

  const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length > 3 || words.length === 0) return false;

  // If ANY word is in NON_NAME_WORDS, it is a sentence fragment, NOT a name!
  for (const w of words) {
    if (NON_NAME_WORDS.has(w)) return false;
    if (w.length < 2) return false; // Single characters (except middle initials) usually aren't full names
  }

  return true;
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

    // Filter out obvious system/metadata artifacts from PDF engines
    if (IGNORED_SYSTEM_DOMAINS.has(domainPart)) return;
    if (email.includes('.png@') || email.includes('.jpg@') || email.includes('.pdf@')) return;

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
        if (isValidHumanName(full)) {
          const parts = full.split(/\s+/);
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
        if (isValidHumanName(potentialName)) {
          const nameParts = potentialName.split(/\s+/);
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
      }
    }

    // If no first name found from line, check if email local-part has clean "firstname.lastname@domain.com"
    if (!firstName) {
      const local = email.split('@')[0];
      if (local.includes('.') && !local.includes('+')) {
        const subparts = local.split('.');
        if (subparts.length === 2 && /^[a-zA-Z]{2,20}$/.test(subparts[0]) && /^[a-zA-Z]{2,20}$/.test(subparts[1])) {
          if (!NON_NAME_WORDS.has(subparts[0].toLowerCase()) && !NON_NAME_WORDS.has(subparts[1].toLowerCase())) {
            firstName = subparts[0].charAt(0).toUpperCase() + subparts[0].slice(1);
            lastName = subparts[1].charAt(0).toUpperCase() + subparts[1].slice(1);
          }
        }
      } else if (/^[a-zA-Z]{3,15}$/.test(local) && !NON_NAME_WORDS.has(local.toLowerCase())) {
        // e.g. "moksh@prearn.com" -> Moksh
        firstName = local.charAt(0).toUpperCase() + local.slice(1);
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
      selected: hygiene.status === 'valid' || hygiene.status === 'suppressed',
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
      selected: hygiene.status === 'valid' || hygiene.status === 'suppressed',
    });
  }

  return contacts;
}
