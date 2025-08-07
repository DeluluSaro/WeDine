import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

export async function GET(req: NextRequest) {
  try {
    // Fetch all admin credentials from Sanity
    const adminCredentials = await client.fetch(`
      *[_type == "adminCredentials"] {
        _id,
        shopName,
        adminUsername,
        adminPassword,
        isActive,
        createdAt,
        lastLogin
      }
    `);

    console.log('All admin credentials:', adminCredentials);

    return NextResponse.json({
      success: true,
      totalCredentials: adminCredentials.length,
      credentials: adminCredentials.map((cred: any) => ({
        shopName: cred.shopName,
        username: cred.adminUsername,
        isActive: cred.isActive,
        createdAt: cred.createdAt,
        lastLogin: cred.lastLogin
      })),
      activeCredentials: adminCredentials.filter((cred: any) => cred.isActive).length,
      inactiveCredentials: adminCredentials.filter((cred: any) => !cred.isActive).length
    });

  } catch (error) {
    console.error('Check credentials error:', error);
    return NextResponse.json({ 
      error: 'Failed to check credentials',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 