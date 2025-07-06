const fetch = require('node-fetch');

async function testValidation() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Validation Endpoints...\n');

  // Test 1: Phone number validation
  console.log('📱 Test 1: Phone number validation');
  try {
    const phoneResponse = await fetch(`${baseUrl}/validate-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: '09123456789' })
    });
    const phoneResult = await phoneResponse.json();
    console.log('Phone validation result:', phoneResult);
  } catch (err) {
    console.error('Phone validation error:', err.message);
  }

  // Test 2: Name validation
  console.log('\n👤 Test 2: Name validation');
  try {
    const nameResponse = await fetch(`${baseUrl}/validate-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        first_name: 'John', 
        last_name: 'Doe', 
        middle_name: 'Smith',
        phone_number: '09123456789'
      })
    });
    const nameResult = await nameResponse.json();
    console.log('Name validation result:', nameResult);
  } catch (err) {
    console.error('Name validation error:', err.message);
  }

  console.log('\n✅ Validation tests completed!');
}

testValidation(); 