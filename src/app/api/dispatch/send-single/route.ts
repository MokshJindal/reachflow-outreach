import { NextRequest, NextResponse } from 'next/server';
import { sendEmailMessage, sendWhatsAppMessage } from '@/lib/dispatch-engine';
import { AppSettings, OutreachChannel } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      settings,
      channel,
      toEmail,
      toName,
      toPhone,
      subject,
      bodyText,
      whatsappText,
      isAiVaried
    } = data as {
      settings: AppSettings;
      channel: OutreachChannel;
      toEmail: string;
      toName: string;
      toPhone?: string;
      subject: string;
      bodyText: string;
      whatsappText?: string;
      isAiVaried?: boolean;
    };

    let emailResult: any = null;
    let waResult: any = null;

    if (channel === 'email' || channel === 'both') {
      emailResult = await sendEmailMessage(settings, toEmail, toName, subject, bodyText);
    }

    if (channel === 'whatsapp' || channel === 'both') {
      if (toPhone) {
        waResult = await sendWhatsAppMessage(settings, toPhone, whatsappText || bodyText);
      } else {
        waResult = { success: false, error: 'Recipient phone number missing' };
      }
    }

    const overallSuccess = 
      channel === 'email' ? emailResult?.success :
      channel === 'whatsapp' ? waResult?.success :
      (emailResult?.success || waResult?.success);

    return NextResponse.json({
      success: overallSuccess,
      emailResult,
      waResult,
      timestamp: new Date().toISOString(),
      isAiVaried: !!isAiVaried
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Dispatch failed' }, { status: 500 });
  }
}
