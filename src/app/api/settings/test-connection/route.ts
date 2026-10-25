import { NextRequest, NextResponse } from 'next/server';
import { testSmtpConnection, testTwilioConnection, sendEmailMessage } from '@/lib/dispatch-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, settings, targetEmail } = body;

    if (type === 'email') {
      const result = await testSmtpConnection(settings);
      return NextResponse.json(result);
    } else if (type === 'send_test_email') {
      const dest = targetEmail || settings.fromEmail || settings.smtpUser;
      if (!dest) {
        return NextResponse.json({ ok: false, message: 'Please provide a destination email address.' });
      }
      const res = await sendEmailMessage(
        settings,
        dest,
        'Test Recipient',
        'ReachFlow Live Inbox Delivery Test',
        `Hello,\n\nThis is a live test email from ReachFlow AI confirming that your SMTP rail (${settings.smtpHost}) is fully connected and delivering live emails.\n\nFrom: ${settings.fromName || 'ReachFlow Team'} <${settings.fromEmail || settings.smtpUser}>\nTimestamp: ${new Date().toLocaleString()}\n\nYou are ready to launch your outreach campaigns!`
      );
      if (res.success) {
        return NextResponse.json({ 
          ok: true, 
          message: `Live test email delivered to ${dest}! Check your inbox (and spam/promotions folder).` 
        });
      } else {
        return NextResponse.json({ 
          ok: false, 
          message: `Send failed: ${res.error}` 
        });
      }
    } else if (type === 'whatsapp') {
      const result = await testTwilioConnection(settings);
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, message: 'Invalid test type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || 'Verification error' }, { status: 500 });
  }
}
