import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '../../../../sanity/lib/client';

export async function GET(req: NextRequest) {
  return handleCleanupRequest(req);
}

export async function POST(req: NextRequest) {
  return handleCleanupRequest(req);
}

async function handleCleanupRequest(req: NextRequest): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  try {
    console.log(`[${timestamp}] Cron job cleanup-food-items started`);

    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    const userAgent = req.headers.get('user-agent') || '';

    const isVercelCron = userAgent.includes('Vercel') || req.headers.get('x-vercel-cron');
    const isValidToken = expectedToken && authHeader === `Bearer ${expectedToken}`;

    if (!isVercelCron && !isValidToken) {
      console.log(`[${timestamp}] Unauthorized access attempt`);
      return NextResponse.json({ 
        error: 'Unauthorized',
        timestamp,
        message: 'Invalid or missing authentication'
      }, { status: 401 });
    }

    console.log(`[${timestamp}] Authentication passed, proceeding with food item cleanup`);

    const response = await writeClient.delete({
      query: `*[_type == "foodItem"]`,
    });

    console.log(`[${timestamp}] Food items deleted successfully`, response);

    return NextResponse.json({
      success: true,
      message: 'Food items deleted successfully',
      timestamp,
      data: response,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[${timestamp}] Cron job error:`, {
      error: err.message,
      stack: err.stack,
    });

    return NextResponse.json({
      success: false,
      message: 'Cron job error',
      timestamp,
      error: err.message,
    }, { status: 500 });
  }
}
