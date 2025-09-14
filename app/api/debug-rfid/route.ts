import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function POST(request: NextRequest) {
  try {
    const { email, rfidCardId, studentName } = await request.json();

    console.log('Debug RFID registration:', { email, rfidCardId, studentName });

    // Check if wallet exists
    const existingWallet = await writeClient.fetch(
      `*[_type == "wallet" && userEmail == $userEmail][0]`,
      { userEmail: email }
    );
    
    console.log('Found wallet:', existingWallet);

    if (!existingWallet) {
      return NextResponse.json({
        success: false,
        message: 'Wallet not found',
        debug: {
          email,
          walletExists: false,
          query: `*[_type == "wallet" && userEmail == "${email}"][0]`
        }
      });
    }

    // Try to update the wallet
    try {
      const walletUpdate = await writeClient
        .patch(existingWallet._id)
        .set({
          rfidCardId: rfidCardId.trim(),
          studentName: studentName.trim(),
          rfidVerified: true,
          rfidVerifiedAt: new Date().toISOString()
        })
        .commit();

      console.log('Wallet update successful:', walletUpdate);

      return NextResponse.json({
        success: true,
        message: 'RFID registration successful',
        debug: {
          walletId: existingWallet._id,
          updateResult: walletUpdate,
          rfidCardId: rfidCardId.trim(),
          studentName: studentName.trim()
        }
      });

    } catch (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({
        success: false,
        message: 'Update failed',
        debug: {
          error: updateError instanceof Error ? updateError.message : 'Unknown error',
          walletId: existingWallet._id,
          walletData: existingWallet
        }
      });
    }

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
