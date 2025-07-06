const FormData = require('form-data');
const fs = require('fs');

async function testDuplicateValidation() {
  const fetch = (await import('node-fetch')).default;
  
  console.log('🧪 Testing Duplicate Validation Logic...\n');
  
  // Create a test image file
  const testImagePath = './uploads/1751177895230-154509407.png';
  
  if (!fs.existsSync(testImagePath)) {
    console.log('❌ Test image not found, creating dummy file...');
    fs.writeFileSync('./test-image.png', 'dummy image data');
  }
  
  const imagePath = fs.existsSync(testImagePath) ? testImagePath : './test-image.png';
  
  // Test scenarios
  const testScenarios = [
    {
      name: 'Exact Name Match (Same Person)',
      data: {
        last_name: 'Doe',
        first_name: 'John',
        middle_name: 'Smith',
        phone_number: '09123456789', // Different phone
        email: 'john.doe@test.com'
      },
      expected: 'Should allow with flag for same person'
    },
    {
      name: 'Same First/Last, Different Middle',
      data: {
        last_name: 'Doe',
        first_name: 'John',
        middle_name: 'Robert', // Different middle name
        phone_number: '09123456790',
        email: 'john.robert.doe@test.com'
      },
      expected: 'Should allow with flag for potential duplicate'
    },
    {
      name: 'Same First/Last, No Middle',
      data: {
        last_name: 'Doe',
        first_name: 'John',
        middle_name: '', // No middle name
        phone_number: '09123456791',
        email: 'john.doe2@test.com'
      },
      expected: 'Should allow with flag for potential duplicate'
    },
    {
      name: 'Completely Different Name',
      data: {
        last_name: 'Smith',
        first_name: 'Jane',
        middle_name: 'Marie',
        phone_number: '09123456792',
        email: 'jane.smith@test.com'
      },
      expected: 'Should allow normally (no duplicate)'
    }
  ];
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n📋 Test ${i + 1}: ${scenario.name}`);
    console.log(`Expected: ${scenario.expected}`);
    console.log(`Data: ${scenario.data.first_name} ${scenario.data.middle_name} ${scenario.data.last_name} (${scenario.data.phone_number})`);
    
    const formData = new FormData();
    
    // Add form fields
    Object.keys(scenario.data).forEach(key => {
      formData.append(key, scenario.data[key]);
    });
    
    // Add required fields
    formData.append('gender', 'Male');
    formData.append('civil_status', 'Single');
    formData.append('country', 'Philippines');
    formData.append('province', 'Test Province');
    formData.append('city_municipality', 'Test City');
    formData.append('barangay', 'Test Barangay');
    formData.append('subdivision_address1', 'Test Address');
    formData.append('zipcode', '1234');
    formData.append('mothers_maiden_name', 'Test Mother');
    formData.append('valid_id_type', 'Passport');
    formData.append('id_number', `TEST${Date.now()}`);
    
    // Add files
    formData.append('selfie', fs.createReadStream(imagePath));
    formData.append('gov_id', fs.createReadStream(imagePath));
    
    try {
      console.log('📤 Sending registration request...');
      const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        body: formData
      });
      
      console.log('📥 Response status:', response.status);
      
      if (response.status === 200) {
        const result = await response.json();
        console.log('✅ Registration allowed:', result.success);
        console.log('📝 Message:', result.message);
        
        if (result.userInfo && result.userInfo.duplicate_detected) {
          console.log('⚠️ Duplicate detected and flagged for review');
        }
      } else if (response.status === 400) {
        const result = await response.json();
        console.log('❌ Registration blocked:', result.error);
        console.log('📝 Message:', result.message);
      } else {
        console.log('❌ Unexpected response status:', response.status);
      }
      
    } catch (error) {
      console.error('❌ Test error:', error.message);
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Duplicate validation tests completed!');
}

// Run the test
testDuplicateValidation().catch(console.error); 