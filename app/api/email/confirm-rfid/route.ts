import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/wallet?error=invalid-token', request.url));
    }

    // Check if verification tokens exist
    if (!global.verificationTokens) {
      return NextResponse.redirect(new URL('/wallet?error=no-tokens', request.url));
    }

    const verificationData = global.verificationTokens.get(token);

    if (!verificationData) {
      return NextResponse.redirect(new URL('/wallet?error=token-not-found', request.url));
    }

    // Check if token is expired
    if (Date.now() > verificationData.expiresAt) {
      global.verificationTokens.delete(token);
      return NextResponse.redirect(new URL('/wallet?error=token-expired', request.url));
    }

    // Check if already verified
    if (verificationData.verified) {
      return NextResponse.redirect(new URL('/wallet?error=already-verified', request.url));
    }

    // Mark as verified
    verificationData.verified = true;
    global.verificationTokens.set(token, verificationData);

    // Update wallet with RFID card information
    try {
      const walletUpdate = await client
        .patch(verificationData.userId)
        .set({
          rfidCardId: verificationData.rfidCardId,
          studentName: verificationData.studentName,
          rfidVerified: true,
          rfidVerifiedAt: new Date().toISOString()
        })
        .commit();

      console.log('Wallet updated with RFID card:', walletUpdate);

      // Clean up the token
      global.verificationTokens.delete(token);

      // Redirect to wallet with success message
      return NextResponse.redirect(new URL('/wallet?success=rfid-verified', request.url));

    } catch (updateError) {
      console.error('Error updating wallet:', updateError);
      return NextResponse.redirect(new URL('/wallet?error=update-failed', request.url));
    }

  } catch (error) {
    console.error('Email confirmation error:', error);
    return NextResponse.redirect(new URL('/wallet?error=server-error', request.url));
  }
}
