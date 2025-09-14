import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Sanity client...');
    
    // Test basic connection
    const testQuery = await client.fetch('*[_type == "walletType"][0]');
    console.log('Test query result:', testQuery);
    
    return NextResponse.json({
      success: true,
      message: 'Sanity client is working',
      testResult: testQuery
    });

  } catch (error) {
    console.error('Sanity test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Sanity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
