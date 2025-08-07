import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    console.log('Login attempt:', { username, password });

    if (!username || !password) {
      return NextResponse.json({ 
        error: 'Username and password are required' 
      }, { status: 400 });
    }

    // Fetch admin credentials from Sanity
    const adminCredentials = await client.fetch(`
      *[_type == "adminCredentials"] {
        _id,
        shopName,
        adminUsername,
        adminPassword,
        isActive,
        lastLogin
      }
    `);

    console.log('Fetched admin credentials:', adminCredentials);

    // Find matching credentials (check both active and inactive for debugging)
    const matchingCredential = adminCredentials.find((cred: any) => 
      cred.adminUsername === username && cred.adminPassword === password
    );

    console.log('Matching credential:', matchingCredential);

    if (!matchingCredential) {
      return NextResponse.json({ 
        error: 'Invalid username or password',
        debug: {
          totalCredentials: adminCredentials.length,
          availableUsernames: adminCredentials.map((c: any) => c.adminUsername),
          isActiveCredentials: adminCredentials.filter((c: any) => c.isActive).length
        }
      }, { status: 401 });
    }

    // Check if the credential is active
    if (!matchingCredential.isActive) {
      return NextResponse.json({ 
        error: 'Admin account is inactive. Please contact administrator.' 
      }, { status: 401 });
    }

    // Update last login time
    const now = new Date();
    await writeClient.patch(matchingCredential._id, {
      set: {
        lastLogin: now.toISOString(),
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      shopName: matchingCredential.shopName,
      username: matchingCredential.adminUsername,
      loginTime: now.toISOString()
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ 
      error: 'Login failed. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 