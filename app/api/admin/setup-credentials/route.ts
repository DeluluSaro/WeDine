import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function POST(req: NextRequest) {
  try {
    const { shopName, adminUsername, adminPassword } = await req.json();

    if (!shopName || !adminUsername || !adminPassword) {
      return NextResponse.json({ 
        error: 'Shop name, username, and password are required' 
      }, { status: 400 });
    }

    // Check if credentials already exist for this shop
    const existingCredentials = await writeClient.fetch(`
      *[_type == "adminCredentials" && shopName == $shopName][0] {
        _id,
        shopName,
        adminUsername
      }
    `, { shopName });

    if (existingCredentials) {
      return NextResponse.json({ 
        error: 'Admin credentials already exist for this shop',
        existingCredentials
      }, { status: 409 });
    }

    // Create new admin credentials
    const now = new Date();
    const newCredentials = await writeClient.create({
      _type: 'adminCredentials',
      shopName,
      adminUsername,
      adminPassword,
      isActive: true,
      createdAt: now.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Admin credentials created successfully',
      credentials: {
        shopName: newCredentials.shopName,
        adminUsername: newCredentials.adminUsername,
        createdAt: newCredentials.createdAt
      }
    });

  } catch (error) {
    console.error('Setup credentials error:', error);
    return NextResponse.json({ 
      error: 'Failed to create admin credentials',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 