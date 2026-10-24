import Anthropic from '@anthropic-ai/sdk';
import { DeliverabilityAudit, Contact } from '../types';

// Pre-compiled list of aggressive spam buzzwords
const SPAM_TRIGGER_DICTIONARY = [
  '100% free', 'act now', 'apply now', 'as seen on', 'billion dollars', 'cash bonus',
  'click here', 'click below', 'congratulations', 'cure', 'dear friend', 'direct email',
  'double your', 'earn money', 'extra income', 'fast cash', 'free consultation',
  'free gift', 'free info', 'free trial', 'get out of debt', 'guaranteed',
  'income from home', 'increase sales', 'instant', 'limited time', 'make money',
  'miracle', 'no catch', 'no cost', 'no fees', 'no obligation', 'no risk',
  'not spam', 'one time', 'online marketing', 'order now', 'promise you',
  'pure profit', 'risk free', 'save big', 'special promotion', 'urgent',
  'winner', 'you have been selected'
];

// Offline synonym/phrase spinner for instant variation without API cost
const SYNONYM_MAP: Record<string, string[]> = {
  'hope this email finds you well': [
    'hope you are having a productive week',
    'hope all is well on your end',
    'reaching out directly to you',
    'trust you are having a great week'
  ],
  'wanted to reach out': [
    'reaching out today',
    'connecting with you',
    'dropping a quick note',
    'getting in touch'
  ],
  'let me know if you are interested': [
    'would love to hear your thoughts',
    'open to a quick conversation?',
    'let me know if this resonates with your team',
    'happy to share a brief 2-minute overview'
  ],
  'quick question': [
    'brief question',
    'quick thought for you',
    'short inquiry',
    'quick question for your team'
  ],
  'best regards': [
    'warm regards',
    'best',
    'sincerely',
    'cheers',
    'all the best'
  ]
};

export function offlineSpamAudit(subject: string, body: string): DeliverabilityAudit {
  const combined = `${subject} ${body}`.toLowerCase();
  const foundTriggers: string[] = [];

  for (const word of SPAM_TRIGGER_DICTIONARY) {
    if (combined.includes(word)) {
      foundTriggers.push(word);
    }
  }

  // Calculate rough risk score
  let score = 5; // Base pristine score
  score += foundTriggers.length * 15;
  if (subject.toUpperCase() === subject && subject.length > 5) score += 25; // ALL CAPS subject
  if ((subject.match(/!/g) || []).length > 1) score += 20; // Multiple exclamation marks
  if ((body.match(/!/g) || []).length > 4) score += 15;
  if (combined.includes('$$$') || combined.includes('₹₹₹')) score += 20;

  const riskScore = Math.min(100, Math.max(0, score));

  let verdict: DeliverabilityAudit['verdict'] = 'safe';
  if (riskScore >= 75) verdict = 'critical';
  else if (riskScore >= 50) verdict = 'high_risk';
  else if (riskScore >= 25) verdict = 'moderate_risk';

  const suggestions: string[] = [];
  if (foundTriggers.length > 0) {
    suggestions.push(`Avoid high-risk spam trigger phrases: ${foundTriggers.slice(0, 4).join(', ')}.`);
  }
  if (subject.toUpperCase() === subject && subject.length > 5) {
    suggestions.push('Avoid using ALL CAPS in the subject line.');
  }
  if ((subject.match(/!/g) || []).length > 0) {
    suggestions.push('Avoid exclamation points in the subject line.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Copy looks clean, natural, and low-risk.');
  }

  return {
    riskScore,
    verdict,
    spamTriggerWords: foundTriggers,
    suggestions,
    recommendations: [
      'Ensure SPF, DKIM, and DMARC alignment on your sending domain.',
      'Use personalized variables like {{first_name}} to boost engagement.',
      'Keep email length under 150 words for optimal cold outreach response rates.'
    ]
  };
}

export function offlineVaryCopy(text: string, seed: number): string {
  let result = text;
  let counter = seed;
  for (const [phrase, alternatives] of Object.entries(SYNONYM_MAP)) {
    const regex = new RegExp(phrase, 'gi');
    if (regex.test(result)) {
      const chosen = alternatives[counter % alternatives.length];
      result = result.replace(regex, chosen);
      counter++;
    }
  }
  return result;
}

export async function auditDeliverabilityWithClaude(
  apiKey: string,
  subject: string,
  body: string
): Promise<DeliverabilityAudit> {
  if (!apiKey) {
    return offlineSpamAudit(subject, body);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 600,
      system: `You are an elite email deliverability engineer and Bayesian spam filter specialist.
Your task is to analyze email copy and evaluate its likelihood of triggering spam filters (SpamAssassin, Google Postmaster AI, Microsoft SmartScreen) or provoking user complaints.
Output strictly valid JSON with this shape:
{
  "risk_score": number (0 to 100, where 0 is pristine and 100 is definite spam),
  "verdict": "safe" | "moderate_risk" | "high_risk" | "critical",
  "spam_trigger_words": string[],
  "suggestions": string[]
}`,
      messages: [
        {
          role: 'user',
          content: `Subject: ${subject}\n\nBody:\n${body}`
        }
      ]
    });

    const contentBlock = response.content[0];
    if (contentBlock && contentBlock.type === 'text') {
      const jsonStr = contentBlock.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(jsonStr);
      return {
        riskScore: parsed.risk_score ?? 15,
        verdict: parsed.verdict ?? 'safe',
        spamTriggerWords: parsed.spam_trigger_words ?? [],
        suggestions: parsed.suggestions ?? ['Copy looks balanced.'],
        recommendations: [
          'Verify sender SPF/DKIM/DMARC in domain DNS.',
          'Inject RFC 8058 One-Click Unsubscribe headers on bulk marketing.'
        ]
      };
    }
  } catch (err) {
    console.warn('Claude deliverability audit fallback to offline:', err);
  }

  return offlineSpamAudit(subject, body);
}

export async function generateVariationsWithClaude(
  apiKey: string,
  model: string,
  subject: string,
  body: string,
  contacts: Contact[]
): Promise<Array<{ contactId: string; variedSubject: string; variedBody: string }>> {
  // If no Claude API key, use our smart offline variation engine
  if (!apiKey) {
    return contacts.map((c, idx) => ({
      contactId: c.id,
      variedSubject: offlineVaryCopy(interpolateVariables(subject, c), idx),
      variedBody: offlineVaryCopy(interpolateVariables(body, c), idx)
    }));
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    
    // Batch process up to 25 contacts at a time to stay efficient and fast
    const promptContacts = contacts.map(c => ({
      id: c.id,
      first_name: c.firstName || '',
      company: c.company || '',
      email: c.email
    }));

    const prompt = `You are a high-conversion cold outreach expert.
Given the original subject line and email body, generate a slightly varied phrasing for each recipient so each email has unique sentence rhythm, word choice, and phrasing to prevent spam filter clustering, while keeping 100% of the original meaning, intent, call-to-action, links, and tone.

Original Subject: ${subject}
Original Body:
${body}

Recipients:
${JSON.stringify(promptContacts, null, 2)}

Output strictly valid JSON with an array of objects:
[
  {
    "id": "contact_id",
    "variedSubject": "...",
    "variedBody": "..."
  }
]`;

    const response = await anthropic.messages.create({
      model: model || 'claude-3-5-haiku-20241022',
      max_tokens: 2500,
      temperature: 0.7,
      system: 'Output strictly valid JSON array without any markdown fences or explanation.',
      messages: [{ role: 'user', content: prompt }]
    });

    const block = response.content[0];
    if (block && block.type === 'text') {
      const jsonStr = block.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        const resultMap = new Map(parsed.map((item: any) => [item.id, item]));
        return contacts.map((c, idx) => {
          const item = resultMap.get(c.id);
          if (item && item.variedSubject && item.variedBody) {
            return {
              contactId: c.id,
              variedSubject: interpolateVariables(item.variedSubject, c),
              variedBody: interpolateVariables(item.variedBody, c)
            };
          }
          return {
            contactId: c.id,
            variedSubject: offlineVaryCopy(interpolateVariables(subject, c), idx),
            variedBody: offlineVaryCopy(interpolateVariables(body, c), idx)
          };
        });
      }
    }
  } catch (err) {
    console.warn('Claude variation failed, falling back to offline variation:', err);
  }

  // Fallback to offline variation
  return contacts.map((c, idx) => ({
    contactId: c.id,
    variedSubject: offlineVaryCopy(interpolateVariables(subject, c), idx),
    variedBody: offlineVaryCopy(interpolateVariables(body, c), idx)
  }));
}

export function interpolateVariables(template: string, contact: Contact): string {
  if (!template) return '';
  let output = template;

  const mapping: Record<string, string> = {
    first_name: contact.firstName || 'there',
    firstName: contact.firstName || 'there',
    last_name: contact.lastName || '',
    lastName: contact.lastName || '',
    name: contact.firstName ? `${contact.firstName} ${contact.lastName || ''}`.trim() : 'there',
    company: contact.company || 'your team',
    email: contact.email || '',
    phone: contact.phone || ''
  };

  // Replace {{variable}} and {{variable | default: "fallback"}}
  output = output.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*default:\s*["']([^"']+)["'])?\s*\}\}/g, (_, key, def) => {
    const val = mapping[key];
    if (val !== undefined && val !== '') return val;
    return def !== undefined ? def : '';
  });

  return output;
}
