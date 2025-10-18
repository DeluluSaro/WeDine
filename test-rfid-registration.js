// Test script to register RFID card 0367A8A5
const testRfidRegistration = async () => {
  try {
    // Test data
    const testData = {
      email: 'test@example.com',
      rfidCardId: '0367A8A5',
      studentName: 'Test User',
      userId: 'test_user_123'
    };

    console.log('Testing RFID registration with data:', testData);

    const response = await fetch('http://localhost:3000/api/email/direct-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Registration result:', result);

    if (result.success) {
      console.log('✅ RFID card registered successfully!');
      
      // Test fetching orders by RFID
      const ordersResponse = await fetch(`http://localhost:3000/api/orders/by-rfid?rfidCardId=0367A8A5`);
      const ordersResult = await ordersResponse.json();
      console.log('Orders fetch result:', ordersResult);
    } else {
      console.log('❌ RFID card registration failed:', result.message);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
};

// Run the test
testRfidRegistration();

