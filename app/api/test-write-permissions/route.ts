import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing write permissions...');
    console.log('SANITY_API_TOKEN exists:', !!process.env.SANITY_API_TOKEN);
    console.log('Token length:', process.env.SANITY_API_TOKEN?.length || 0);
    
    // Test a simple query first
    const testQuery = await writeClient.fetch('*[_type == "walletType"][0]');
    console.log('Test query result:', testQuery);
    
    return NextResponse.json({
      success: true,
      message: 'Write permissions test',
      hasToken: !!process.env.SANITY_API_TOKEN,
      tokenLength: process.env.SANITY_API_TOKEN?.length || 0,
      testResult: testQuery
    });

  } catch (error) {
    console.error('Write permissions test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Write permissions test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasToken: !!process.env.SANITY_API_TOKEN,
        tokenLength: process.env.SANITY_API_TOKEN?.length || 0
      },
      { status: 500 }
    );
  }
}
