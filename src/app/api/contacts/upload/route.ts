import { NextRequest, NextResponse } from 'next/server';
import { extractContactsFromUnstructuredText, parseRawInput, evaluateContactHygiene, sanitizePhone, smartDomainToCompany } from '@/lib/hygiene';
import * as XLSX from 'xlsx';
import { Contact } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let contacts: Contact[] = [];

    // 1. PDF File Parsing
    if (fileName.endsWith('.pdf')) {
      try {
        const pdf = require('pdf-parse');
        let fullText = '';
        if (pdf.PDFParse) {
          const parser = new pdf.PDFParse({ data: buffer });
          const result = await parser.getText();
          fullText = result.pages 
            ? result.pages.map((p: any) => p.text).join('\n') 
            : (typeof result === 'string' ? result : (result.text || ''));
        } else if (typeof pdf === 'function') {
          const result = await pdf(buffer);
          fullText = result.text || '';
        }

        contacts = extractContactsFromUnstructuredText(fullText);
      } catch (pdfErr: any) {
        console.error('PDF parsing error:', pdfErr);
        // Fallback: search buffer strings for emails
        const rawString = buffer.toString('latin1');
        contacts = extractContactsFromUnstructuredText(rawString);
      }
    }
    // 2. Excel Spreadsheets (.xlsx, .xls)
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const seenEmails = new Set<string>();

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        for (const row of rows) {
          let email = '';
          let firstName = '';
          let lastName = '';
          let company = '';
          let phone = '';

          // Search row keys for common field names
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase();
            const val = String(row[key]).trim();
            if (!val) continue;

            if (cleanKey.includes('email') || cleanKey.includes('e-mail') || cleanKey.includes('mail') || (val.includes('@') && val.includes('.'))) {
              if (val.includes('@')) email = val.toLowerCase();
            } else if (cleanKey === 'first_name' || cleanKey === 'firstname' || cleanKey === 'fname') {
              firstName = val;
            } else if (cleanKey === 'last_name' || cleanKey === 'lastname' || cleanKey === 'lname') {
              lastName = val;
            } else if (cleanKey === 'name' || cleanKey === 'full_name' || cleanKey === 'fullname') {
              const parts = val.split(' ');
              firstName = parts[0] || '';
              lastName = parts.slice(1).join(' ') || '';
            } else if (cleanKey.includes('company') || cleanKey.includes('organization') || cleanKey.includes('org') || cleanKey.includes('business')) {
              company = val;
            } else if (cleanKey.includes('phone') || cleanKey.includes('mobile') || cleanKey.includes('cell') || cleanKey.includes('tel') || cleanKey.includes('whatsapp')) {
              phone = val;
            }
          }

          if (email) {
            if (!company && email.includes('@')) {
              company = smartDomainToCompany(email.split('@')[1]);
            }
            const hygiene = evaluateContactHygiene(email, seenEmails);
            seenEmails.add(email);

            contacts.push({
              id: `cnt_${Date.now()}_${contacts.length}_${Math.random().toString(36).substring(2, 6)}`,
              email,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              company: company || undefined,
              phone: sanitizePhone(phone),
              status: hygiene.status,
              statusReason: hygiene.reason,
            });
          }
        }
      }
    }
    // 3. Word Documents (.docx)
    else if (fileName.endsWith('.docx')) {
      const rawString = buffer.toString('utf-8');
      // Clean XML tags from docx content
      const cleaned = rawString.replace(/<[^>]+>/g, ' ');
      contacts = extractContactsFromUnstructuredText(cleaned);
    }
    // 4. CSV, TSV, TXT, JSON, vCard, RTF, or any raw file
    else {
      const text = buffer.toString('utf-8');
      contacts = parseRawInput(text);
      if (contacts.length === 0) {
        contacts = extractContactsFromUnstructuredText(text);
      }
    }

    const summary = {
      total: contacts.length,
      valid: contacts.filter(c => c.status === 'valid').length,
      disposable: contacts.filter(c => c.status === 'disposable').length,
      duplicate: contacts.filter(c => c.status === 'duplicate').length,
      suppressed: contacts.filter(c => c.status === 'suppressed').length,
      invalid: contacts.filter(c => c.status === 'invalid').length,
    };

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      contacts,
      summary
    });
  } catch (err: any) {
    console.error('File upload processing failed:', err);
    return NextResponse.json({ error: err.message || 'File processing failed' }, { status: 500 });
  }
}
