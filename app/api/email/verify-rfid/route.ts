import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createShopInFirebase } from '@/lib/firebase-rfid';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, rfidCardId, studentName, userId } = await request.json();

    console.log('Email verification request:', { email, rfidCardId, studentName, userId });

    if (!email || !rfidCardId || !studentName || !userId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { success: false, message: 'Email service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
    
    // Store verification data temporarily (in production, use a database)
    const verificationData = {
      email,
      rfidCardId,
      studentName,
      userId,
      token: verificationToken,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      verified: false
    };

    // Store in memory (in production, use Redis or database)
    if (!global.verificationTokens) {
      global.verificationTokens = new Map();
    }
    global.verificationTokens.set(verificationToken, verificationData);

    // Create verification URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/email/confirm-rfid?token=${verificationToken}`;

    console.log('Sending email to:', email);
    console.log('Verification URL:', verificationUrl);

    // Try Resend first
    try {
      const emailResult = await resend.emails.send({
        from: 'WeDine <onboarding@resend.dev>', // Use Resend's default domain
        to: [email],
        subject: 'Verify Your RFID Card - WeDine',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🍽️ WeDine RFID Verification</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${studentName}!</h2>
              
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                You're almost done setting up your RFID card for WeDine! Please verify your email address to complete the registration.
              </p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-bottom: 10px;">Your RFID Card Details:</h3>
                <p style="color: #6b7280; margin: 5px 0;"><strong>Card ID:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${rfidCardId}</code></p>
                <p style="color: #6b7280; margin: 5px 0;"><strong>Student Name:</strong> ${studentName}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: linear-gradient(135deg, #10b981, #059669); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          font-size: 16px;
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                  ✅ Verify RFID Card
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                This verification link will expire in 15 minutes for security reasons.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                If you didn't request this verification, please ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
              <p>© 2024 WeDine. All rights reserved.</p>
            </div>
          </div>
        `,
      });

      if (emailResult.error) {
        console.error('Resend email error:', emailResult.error);
        throw new Error(`Resend error: ${JSON.stringify(emailResult.error)}`);
      }

      console.log('Email sent successfully via Resend:', emailResult.data?.id);

      return NextResponse.json({
        success: true,
        message: 'Verification email sent successfully! Please check your inbox.',
        emailId: emailResult.data?.id
      });

    } catch (resendError) {
      console.error('Resend failed, trying fallback method:', resendError);
      
      // Fallback: Just log the verification link for development
      console.log('=== EMAIL VERIFICATION FALLBACK ===');
      console.log('Email:', email);
      console.log('Verification URL:', verificationUrl);
      console.log('RFID Card ID:', rfidCardId);
      console.log('Student Name:', studentName);
      console.log('=====================================');

      return NextResponse.json({
        success: true,
        message: `Email service temporarily unavailable. Please use this verification link: ${verificationUrl}`,
        verificationUrl: verificationUrl,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
