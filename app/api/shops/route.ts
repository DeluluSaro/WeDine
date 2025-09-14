import { NextRequest, NextResponse } from 'next/server';
import { getAllShops } from '@/lib/firebase-rfid';

export async function GET(request: NextRequest) {
  try {
    // Get all shops from Firebase
    const shops = await getAllShops();

    if (!shops) {
      return NextResponse.json({
        success: true,
        shops: [],
        shopDetails: []
      });
    }

    const shopNames = Object.keys(shops);
    const shopDetails = Object.entries(shops).map(([shopName, shopData]: [string, any]) => ({
      shopName: shopName,
      shopId: shopData.shopId || shopName,
      deviceId: shopData.deviceId || 'Unknown',
      createdAt: shopData.createdAt,
      status: shopData.status || 'active'
    }));

    return NextResponse.json({
      success: true,
      shops: shopNames,
      shopDetails: shopDetails
    });

  } catch (error) {
    console.error('Error fetching shops:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch shops'
    }, { status: 500 });
  }
}