import { NextRequest, NextResponse } from 'next/server';
import { createShopInFirebase } from '@/lib/firebase-rfid';

export async function POST(request: NextRequest) {
  try {
    const { shopName, deviceId, adminKey } = await request.json();

    // Validate admin key
    if (adminKey !== process.env.ADMIN_RFID_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    // Validate required fields
    if (!shopName) {
      return NextResponse.json({
        success: false,
        message: 'Missing required field: shopName'
      }, { status: 400 });
    }

    // Create shop in Firebase
    const firebaseSuccess = await createShopInFirebase(shopName);

    if (!firebaseSuccess) {
      return NextResponse.json({
        success: false,
        message: 'Failed to create shop in Firebase'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Shop created successfully in Firebase',
      shop: {
        shopName: shopName,
        deviceId: deviceId || 'Not specified',
        firebaseCreated: firebaseSuccess
      }
    });

  } catch (error) {
    console.error('Error creating shop:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create shop'
    }, { status: 500 });
  }
}
