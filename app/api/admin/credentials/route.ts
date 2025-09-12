import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/sanity/lib/client';

/**
 * GET /api/admin/credentials
 * Fetches admin credentials (for verification purposes)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ 
        error: 'Username is required' 
      }, { status: 400 });
    }

    const credentials = await client.fetch(
      `*[_type == "adminCredentials" && username == $username][0] {
        _id,
        username,
        isActive,
        createdAt,
        lastLogin
      }`,
      { username }
    );

    if (!credentials) {
      return NextResponse.json({ 
        error: 'Admin credentials not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      credentials: {
        id: credentials._id,
        username: credentials.username,
        isActive: credentials.isActive,
        createdAt: credentials.createdAt,
        lastLogin: credentials.lastLogin
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Admin credentials fetch error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch admin credentials',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/credentials
 * Creates new admin credentials
 */
export async function POST(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const { username, password, isActive = true } = body;

    if (!username || !password) {
      return NextResponse.json({ 
        error: 'Username and password are required' 
      }, { status: 400 });
    }

    // Check if username already exists
    const existingCredentials = await client.fetch(
      `*[_type == "adminCredentials" && username == $username][0]`,
      { username }
    );

    if (existingCredentials) {
      return NextResponse.json({ 
        error: 'Username already exists' 
      }, { status: 400 });
    }

    // Hash password (in production, use bcrypt or similar)
    const hashedPassword = Buffer.from(password).toString('base64'); // Simple encoding for demo

    const credentials = await writeClient.create({
      _type: 'adminCredentials',
      username,
      password: hashedPassword,
      isActive: Boolean(isActive),
      createdAt: new Date().toISOString(),
      lastLogin: null
    });

    return NextResponse.json({ 
      success: true, 
      credentials: {
        id: credentials._id,
        username: credentials.username,
        isActive: credentials.isActive,
        createdAt: credentials.createdAt
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Admin credentials creation error:', err);
    return NextResponse.json({ 
      error: 'Failed to create admin credentials',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/credentials
 * Updates admin credentials
 */
export async function PUT(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const body = await req.json();
    const { id, username, password, isActive } = body;

    if (!id) {
      return NextResponse.json({ 
        error: 'Admin ID is required' 
      }, { status: 400 });
    }

    // Check if credentials exist
    const existingCredentials = await client.fetch(
      `*[_type == "adminCredentials" && _id == $id][0]`,
      { id }
    );

    if (!existingCredentials) {
      return NextResponse.json({ 
        error: 'Admin credentials not found' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    if (username !== undefined) {
      // Check if new username already exists
      const usernameExists = await client.fetch(
        `*[_type == "adminCredentials" && username == $username && _id != $id][0]`,
        { username, id }
      );

      if (usernameExists) {
        return NextResponse.json({ 
          error: 'Username already exists' 
        }, { status: 400 });
      }

      updateData.username = username;
    }

    if (password !== undefined) {
      // Hash password
      const hashedPassword = Buffer.from(password).toString('base64');
      updateData.password = hashedPassword;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    updateData.updatedAt = new Date().toISOString();

    const updatedCredentials = await writeClient
      .patch(id)
      .set(updateData)
      .commit();

    return NextResponse.json({ 
      success: true, 
      credentials: {
        id: updatedCredentials._id,
        username: updatedCredentials.username,
        isActive: updatedCredentials.isActive,
        updatedAt: updatedCredentials.updatedAt
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Admin credentials update error:', err);
    return NextResponse.json({ 
      error: 'Failed to update admin credentials',
      details: err.message 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/credentials
 * Deletes admin credentials
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!writeClient.config().token) {
      throw new Error('Sanity writeClient is missing a write-enabled token!');
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'Admin ID is required' 
      }, { status: 400 });
    }

    // Check if credentials exist
    const existingCredentials = await client.fetch(
      `*[_type == "adminCredentials" && _id == $id][0]`,
      { id }
    );

    if (!existingCredentials) {
      return NextResponse.json({ 
        error: 'Admin credentials not found' 
      }, { status: 404 });
    }

    await writeClient.delete(id);

    return NextResponse.json({ 
      success: true, 
      message: 'Admin credentials deleted successfully' 
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Admin credentials deletion error:', err);
    return NextResponse.json({ 
      error: 'Failed to delete admin credentials',
      details: err.message 
    }, { status: 500 });
  }
}

