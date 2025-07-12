import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { toEmail } = await request.json();
    
    console.log("Testing email to:", toEmail);
    console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
    
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [toEmail || 'test@example.com'],
      subject: 'WeDine Test Email',
      html: '<h1>Test Email from WeDine</h1><p>If you receive this, Resend is working correctly!</p>'
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: 'Email sending failed', details: error },
        { status: 500 }
      );
    }

    console.log("Email sent successfully:", data);
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      data: data
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 