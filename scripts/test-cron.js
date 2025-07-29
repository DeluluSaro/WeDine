#!/usr/bin/env node

/**
 * Test script for Vercel cron job functionality
 * Run this script to test the cleanup system manually
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.VERCEL_URL || 'http://localhost:3000',
  secretToken: process.env.CRON_SECRET_TOKEN,
  timeout: 30000
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: config.timeout
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testCleanupStatus() {
  log('\n🔍 Testing cleanup status...', 'blue');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/orders/cleanup`);
    
    if (response.status === 200) {
      log('✅ Cleanup status endpoint working', 'green');
      log(`📊 Statistics:`, 'yellow');
      log(`   - Active Orders: ${response.data.stats?.activeOrders || 0}`, 'yellow');
      log(`   - Expired Orders: ${response.data.stats?.expiredOrders || 0}`, 'yellow');
      log(`   - History Records: ${response.data.stats?.historyRecords || 0}`, 'yellow');
      log(`   - Last Check: ${response.data.stats?.lastCheck || 'N/A'}`, 'yellow');
    } else {
      log(`❌ Cleanup status failed: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
    }
  } catch (error) {
    log(`❌ Cleanup status error: ${error.message}`, 'red');
  }
}

async function testManualCleanup() {
  log('\n🧹 Testing manual cleanup...', 'blue');
  
  try {
    const headers = {};
    if (config.secretToken) {
      headers['Authorization'] = `Bearer ${config.secretToken}`;
    }

    const response = await makeRequest(`${config.baseUrl}/api/orders/cleanup`, {
      method: 'POST',
      headers
    });
    
    if (response.status === 200) {
      log('✅ Manual cleanup successful', 'green');
      log(`📊 Results:`, 'yellow');
      log(`   - Processed: ${response.data.processed || 0} orders`, 'yellow');
      log(`   - Execution Time: ${response.data.executionTime || 0}ms`, 'yellow');
      if (response.data.errors && response.data.errors.length > 0) {
        log(`   - Errors: ${response.data.errors.length}`, 'red');
        response.data.errors.forEach(error => log(`     - ${error}`, 'red'));
      }
    } else {
      log(`❌ Manual cleanup failed: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
    }
  } catch (error) {
    log(`❌ Manual cleanup error: ${error.message}`, 'red');
  }
}

async function testCronEndpoint() {
  log('\n⏰ Testing cron endpoint...', 'blue');
  
  try {
    const headers = {};
    if (config.secretToken) {
      headers['Authorization'] = `Bearer ${config.secretToken}`;
    }

    const response = await makeRequest(`${config.baseUrl}/api/cron/cleanup-orders`, {
      method: 'POST',
      headers
    });
    
    if (response.status === 200) {
      log('✅ Cron endpoint working', 'green');
      log(`📊 Results:`, 'yellow');
      log(`   - Success: ${response.data.success}`, 'yellow');
      log(`   - Processed: ${response.data.processed || 0} orders`, 'yellow');
      log(`   - Execution Time: ${response.data.executionTime || 0}ms`, 'yellow');
      log(`   - Timestamp: ${response.data.timestamp}`, 'yellow');
    } else {
      log(`❌ Cron endpoint failed: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
    }
  } catch (error) {
    log(`❌ Cron endpoint error: ${error.message}`, 'red');
  }
}

async function testAuthentication() {
  log('\n🔐 Testing authentication...', 'blue');
  
  if (!config.secretToken) {
    log('⚠️  No CRON_SECRET_TOKEN set, skipping authentication test', 'yellow');
    return;
  }

  try {
    // Test without token (should fail)
    const response1 = await makeRequest(`${config.baseUrl}/api/cron/cleanup-orders`, {
      method: 'POST'
    });
    
    if (response1.status === 401) {
      log('✅ Authentication working (rejects unauthorized requests)', 'green');
    } else {
      log(`⚠️  Authentication may not be working: ${response1.status}`, 'yellow');
    }

    // Test with token (should succeed)
    const response2 = await makeRequest(`${config.baseUrl}/api/cron/cleanup-orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secretToken}`
      }
    });
    
    if (response2.status === 200) {
      log('✅ Authentication working (accepts authorized requests)', 'green');
    } else {
      log(`❌ Authentication failed: ${response2.status}`, 'red');
    }
  } catch (error) {
    log(`❌ Authentication test error: ${error.message}`, 'red');
  }
}

async function runAllTests() {
  log('🚀 Starting Vercel Cron Job Tests', 'blue');
  log(`📍 Base URL: ${config.baseUrl}`, 'yellow');
  log(`🔑 Secret Token: ${config.secretToken ? 'Set' : 'Not set'}`, 'yellow');
  
  await testCleanupStatus();
  await testAuthentication();
  await testManualCleanup();
  await testCronEndpoint();
  
  log('\n✨ Tests completed!', 'green');
  log('\n📝 Next steps:', 'blue');
  log('1. Check Vercel dashboard for function logs', 'yellow');
  log('2. Verify cron job is scheduled in Functions tab', 'yellow');
  log('3. Monitor the first automatic run at midnight UTC', 'yellow');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  testCleanupStatus,
  testManualCleanup,
  testCronEndpoint,
  testAuthentication,
  runAllTests
};