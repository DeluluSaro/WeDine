import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const token = process.env.SANITY_API_TOKEN;
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

    console.log('Environment check:', {
      hasToken: !!token,
      tokenLength: token?.length,
      projectId,
      dataset
    });

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'SANITY_API_TOKEN is not configured',
        hasToken: false,
        projectId,
        dataset
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sanity token is configured',
      hasToken: true,
      tokenLength: token.length,
      projectId,
      dataset
    });

  } catch (error) {
    console.error('Token test error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to check token configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 