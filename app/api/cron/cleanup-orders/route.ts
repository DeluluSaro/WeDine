import { NextRequest, NextResponse } from 'next/server';

interface CleanupResult {
  success: boolean;
  message: string;
  timestamp: string;
  processed: number;
  errors?: string[];
  executionTime?: number;
}

export async function GET(req: NextRequest) {
  return handleCleanupRequest(req);
}

export async function POST(req: NextRequest) {
  return handleCleanupRequest(req);
}

async function handleCleanupRequest(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] Cron job cleanup-orders started`);
    
    // Verify the request is from Vercel cron or authorized source
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    const userAgent = req.headers.get('user-agent') || '';
    
    // Allow Vercel cron jobs (they don't send auth headers) or valid token
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

    console.log(`[${timestamp}] Authentication passed, proceeding with cleanup`);

    // Call the cleanup endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : req.nextUrl.origin;
    
    const cleanupUrl = `${baseUrl}/api/orders/cleanup`;
    
    console.log(`[${timestamp}] Calling cleanup endpoint: ${cleanupUrl}`);
    
    const cleanupResponse = await fetch(cleanupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Cron-Cleanup/1.0',
      },
    });

    const result = await cleanupResponse.json();
    const executionTime = Date.now() - startTime;

    if (cleanupResponse.ok) {
      const successResult: CleanupResult = {
        success: true,
        message: 'Cleanup job completed successfully',
        timestamp,
        processed: result.processed || 0,
        executionTime,
        errors: result.errors
      };
      
      console.log(`[${timestamp}] Cron job completed successfully:`, {
        processed: successResult.processed,
        executionTime: `${executionTime}ms`,
        errors: result.errors?.length || 0
      });
      
      return NextResponse.json(successResult);
    } else {
      const errorResult: CleanupResult = {
        success: false,
        message: 'Cleanup job failed',
        timestamp,
        processed: 0,
        executionTime,
        errors: [result.error || 'Unknown error']
      };
      
      console.error(`[${timestamp}] Cron job failed:`, {
        error: result.error,
        executionTime: `${executionTime}ms`
      });
      
      return NextResponse.json(errorResult, { status: 500 });
    }

  } catch (error: unknown) {
    const executionTime = Date.now() - startTime;
    const err = error as Error;
    
    console.error(`[${timestamp}] Cron job error:`, {
      error: err.message,
      stack: err.stack,
      executionTime: `${executionTime}ms`
    });
    
    const errorResult: CleanupResult = {
      success: false,
      message: 'Cron job error',
      timestamp,
      processed: 0,
      executionTime,
      errors: [err.message]
    };
    
    return NextResponse.json(errorResult, { status: 500 });
  }
}