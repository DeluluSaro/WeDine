import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function POST(request: NextRequest) {
  try {
    const { rfidCardId, userEmail, studentName } = await request.json();

    if (!rfidCardId || !userEmail || !studentName) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: rfidCardId, userEmail, studentName'
      }, { status: 400 });
    }

    // Check if RFID card already exists
    const existingCard = await writeClient.fetch(
      `*[_type == "rfidCard" && cardId == $cardId][0]`,
      { cardId: rfidCardId }
    );

    let rfidCardDocument = null;

    if (existingCard) {
      // Update existing RFID card
      rfidCardDocument = await writeClient
        .patch(existingCard._id)
        .set({
          userEmail: userEmail,
          studentName: studentName,
          isActive: true,
          isBlocked: false,
          lastUpdatedAt: new Date().toISOString()
        })
        .commit();
    } else {
      // Create new RFID card document
      rfidCardDocument = await writeClient.create({
        _type: 'rfidCard',
        cardId: rfidCardId,
        userEmail: userEmail,
        studentName: studentName,
        isActive: true,
        isBlocked: false,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'RFID card registered successfully',
      rfidCard: rfidCardDocument
    });

  } catch (error) {
    console.error('Error registering RFID card:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to register RFID card',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

