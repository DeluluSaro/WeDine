import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function POST(request: NextRequest) {
  try {
    const { email, rfidCardId, studentName, userId } = await request.json();

    console.log('Direct verification request:', { email, rfidCardId, studentName, userId });

    if (!email || !rfidCardId || !studentName || !userId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // First, find the wallet document by userEmail
    try {
      const existingWallet = await writeClient.fetch(
        `*[_type == "wallet" && userEmail == $userEmail][0]`,
        { userEmail: email }
      );
      
      console.log('Existing wallet document:', existingWallet);

      if (!existingWallet) {
        console.error('Wallet document not found for user email:', email);
        return NextResponse.json(
          { success: false, message: 'Wallet not found. Please contact support.' },
          { status: 404 }
        );
      }

      // Check if RFID card already exists in rfidCard collection
      const existingRfidCard = await writeClient.fetch(
        `*[_type == "rfidCard" && cardId == $cardId][0]`,
        { cardId: rfidCardId.trim() }
      );

      let rfidCardDocument = null;

      if (existingRfidCard) {
        // Update existing RFID card
        rfidCardDocument = await writeClient
          .patch(existingRfidCard._id)
          .set({
            userEmail: email,
            studentName: studentName.trim(),
            isActive: true,
            isBlocked: false,
            lastUpdatedAt: new Date().toISOString()
          })
          .commit();
      } else {
        // Create new RFID card document
        rfidCardDocument = await writeClient.create({
          _type: 'rfidCard',
          cardId: rfidCardId.trim(),
          userEmail: email,
          studentName: studentName.trim(),
          isActive: true,
          isBlocked: false,
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        });
      }

      // Update wallet with RFID card information using the document ID
      const walletUpdate = await writeClient
        .patch(existingWallet._id)
        .set({
          rfidCardId: rfidCardId.trim(),
          studentName: studentName.trim(),
          rfidVerified: true,
          rfidVerifiedAt: new Date().toISOString()
        })
        .commit();

      console.log('Wallet updated with RFID card:', walletUpdate);
      console.log('RFID card document created/updated:', rfidCardDocument);

      return NextResponse.json({
        success: true,
        message: 'RFID card verified and registered successfully!',
        rfidCardId: rfidCardId.trim(),
        studentName: studentName.trim(),
        rfidCardDocument: rfidCardDocument
      });

    } catch (updateError) {
      console.error('Error updating wallet:', updateError);
      console.error('Update error details:', {
        message: updateError instanceof Error ? updateError.message : 'Unknown error',
        stack: updateError instanceof Error ? updateError.stack : undefined,
        userId,
        email,
        rfidCardId,
        studentName
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Failed to register RFID card: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Direct verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
