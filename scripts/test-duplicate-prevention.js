/**
 * Comprehensive test script for duplicate order prevention
 * Tests both COD and online payment methods
 * Run this script to verify duplicate prevention is working correctly
 */

const testDuplicatePrevention = async () => {
  console.log('🧪 Testing Comprehensive Duplicate Order Prevention...\n');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Mock order data
  const mockOrderData = {
    cartItems: [
      {
        _id: 'test-item-1',
        foodId: {
          _id: 'food-1',
          foodName: 'Chicken-Pizza', // Sanitized to prevent React component name issues
          shopRef: {
            _id: 'shop-1',
            shopName: 'Domino\'s'
          }
        },
        quantity: 1,
        price: 165.5
      }
    ],
    paymentMethod: 'cod',
    userDetails: {
      userId: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      phone: '1234567890'
    }
  };

  const mockOnlineOrderData = {
    ...mockOrderData,
    paymentMethod: 'online'
  };

  console.log('📋 Test Order Data:');
  console.log(JSON.stringify(mockOrderData, null, 2));
  console.log('\n');

  const testResults = {
    cod: { success: 0, duplicates: 0, errors: 0 },
    online: { success: 0, duplicates: 0, errors: 0 }
  };

  try {
    // Test 1: First COD order submission
    console.log('🔄 Test 1: Submitting first COD order...');
    const response1 = await fetch(`${baseUrl}/api/orders/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockOrderData)
    });

    const result1 = await response1.json();
    console.log('Response Status:', response1.status);
    console.log('Response:', JSON.stringify(result1, null, 2));

    if (response1.status === 200) {
      testResults.cod.success++;
      console.log('✅ First COD order created successfully');
    } else {
      testResults.cod.errors++;
      console.log('❌ First COD order failed');
    }

    console.log('\n');

    // Test 2: Immediate duplicate COD order (should be blocked)
    console.log('🔄 Test 2: Submitting immediate duplicate COD order...');
    const response2 = await fetch(`${baseUrl}/api/orders/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockOrderData)
    });

    const result2 = await response2.json();
    console.log('Response Status:', response2.status);
    console.log('Response:', JSON.stringify(result2, null, 2));

    if (response2.status === 409) {
      testResults.cod.duplicates++;
      console.log('✅ Duplicate COD order correctly blocked');
    } else {
      testResults.cod.errors++;
      console.log('❌ Duplicate COD order was not blocked');
    }

    console.log('\n');

    // Test 3: First online order submission
    console.log('🔄 Test 3: Submitting first online order...');
    const response3 = await fetch(`${baseUrl}/api/orders/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockOnlineOrderData)
    });

    const result3 = await response3.json();
    console.log('Response Status:', response3.status);
    console.log('Response:', JSON.stringify(result3, null, 2));

    if (response3.status === 200) {
      testResults.online.success++;
      console.log('✅ First online order created successfully');
    } else {
      testResults.online.errors++;
      console.log('❌ First online order failed');
    }

    console.log('\n');

    // Test 4: Immediate duplicate online order (should be blocked)
    console.log('🔄 Test 4: Submitting immediate duplicate online order...');
    const response4 = await fetch(`${baseUrl}/api/orders/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockOnlineOrderData)
    });

    const result4 = await response4.json();
    console.log('Response Status:', response4.status);
    console.log('Response:', JSON.stringify(result4, null, 2));

    if (response4.status === 409) {
      testResults.online.duplicates++;
      console.log('✅ Duplicate online order correctly blocked');
    } else {
      testResults.online.errors++;
      console.log('❌ Duplicate online order was not blocked');
    }

    console.log('\n');

    // Test 5: Wait and try again (should succeed after timeout)
    console.log('🔄 Test 5: Waiting 3 minutes for timeout...');
    console.log('⏰ This test will wait 3 minutes to verify timeout behavior...');
    
    // In a real test, you would wait here
    // For this script, we'll simulate the timeout behavior
    console.log('⏰ Simulating timeout - in real test, wait 3 minutes here');
    
    // Test 6: Cleanup duplicates
    console.log('🔄 Test 6: Running duplicate cleanup...');
    const cleanupResponse = await fetch(`${baseUrl}/api/orders/cleanup-duplicates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const cleanupResult = await cleanupResponse.json();
    console.log('Cleanup Response Status:', cleanupResponse.status);
    console.log('Cleanup Response:', JSON.stringify(cleanupResult, null, 2));

    if (cleanupResponse.status === 200) {
      console.log('✅ Duplicate cleanup completed successfully');
    } else {
      console.log('❌ Duplicate cleanup failed');
    }

    console.log('\n');

    // Test 7: Test with different user (should succeed)
    console.log('🔄 Test 7: Testing with different user (should succeed)...');
    const differentUserData = {
      ...mockOrderData,
      userDetails: {
        ...mockOrderData.userDetails,
        userId: 'test-user-456'
      }
    };

    const response7 = await fetch(`${baseUrl}/api/orders/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(differentUserData)
    });

    const result7 = await response7.json();
    console.log('Response Status:', response7.status);
    console.log('Response:', JSON.stringify(result7, null, 2));

    if (response7.status === 200) {
      testResults.cod.success++;
      console.log('✅ Different user order created successfully');
    } else {
      testResults.cod.errors++;
      console.log('❌ Different user order failed');
    }

    console.log('\n');

    // Test 8: Test with different items (should succeed)
    console.log('🔄 Test 8: Testing with different items (should succeed)...');
    const differentItemsData = {
      ...mockOrderData,
      cartItems: [
        {
          _id: 'test-item-2',
          foodId: {
            _id: 'food-2',
            foodName: 'Veg Burger',
            shopRef: {
              _id: 'shop-2',
              shopName: 'Burger House'
            }
          },
          quantity: 2,
          price: 120.0
        }
      ]
    };

    const response8 = await fetch(`${baseUrl}/api/orders/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(differentItemsData)
    });

    const result8 = await response8.json();
    console.log('Response Status:', response8.status);
    console.log('Response:', JSON.stringify(result8, null, 2));

    if (response8.status === 200) {
      testResults.cod.success++;
      console.log('✅ Different items order created successfully');
    } else {
      testResults.cod.errors++;
      console.log('❌ Different items order failed');
    }

    console.log('\n');

    // Final cleanup
    console.log('🔄 Final cleanup...');
    const finalCleanupResponse = await fetch(`${baseUrl}/api/orders/cleanup-duplicates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const finalCleanupResult = await finalCleanupResponse.json();
    console.log('Final Cleanup Response:', JSON.stringify(finalCleanupResult, null, 2));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }

  // Print test summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log('COD Orders:');
  console.log(`  ✅ Successful: ${testResults.cod.success}`);
  console.log(`  🛡️ Duplicates Blocked: ${testResults.cod.duplicates}`);
  console.log(`  ❌ Errors: ${testResults.cod.errors}`);
  console.log('');
  console.log('Online Orders:');
  console.log(`  ✅ Successful: ${testResults.online.success}`);
  console.log(`  🛡️ Duplicates Blocked: ${testResults.online.duplicates}`);
  console.log(`  ❌ Errors: ${testResults.online.errors}`);
  console.log('');

  const totalTests = testResults.cod.success + testResults.cod.duplicates + testResults.cod.errors + 
                    testResults.online.success + testResults.online.duplicates + testResults.online.errors;
  
  console.log(`Total Tests: ${totalTests}`);
  
  if (testResults.cod.duplicates > 0 && testResults.online.duplicates > 0) {
    console.log('🎉 Duplicate prevention is working correctly!');
  } else {
    console.log('⚠️ Duplicate prevention may have issues. Check the results above.');
  }

  console.log('\n🔍 To verify in Sanity Studio:');
  console.log('1. Check the "Order" schema for duplicate entries');
  console.log('2. Check the "Order History" schema for duplicate entries');
  console.log('3. Look for orders with the same orderIdentifier');
  console.log('4. Verify that only one record exists per transaction');
};

// Run the test
testDuplicatePrevention().catch(console.error);