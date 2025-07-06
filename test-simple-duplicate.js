const FormData = require('form-data');
const fs = require('fs');

// 🎯 PRELOADED TEST DATA - MODIFY THESE VALUES FOR DIFFERENT TESTS
const TEST_DATA = {
  // Basic Info
  last_name: 'Doe',
  first_name: 'John', 
  middle_name: 'Smith', // Change this to test different scenarios
  phone_number: '09123456789', // Change this for different tests
  email: 'john.doe@test.com',
  
  // Personal Info
  gender: 'Male',
  civil_status: 'Single',
  country: 'Philippines',
  province: 'Test Province',
  city_municipality: 'Test City',
  barangay: 'Test Barangay',
  subdivision_address1: 'Test Address',
  street_address2: '',
  zipcode: '1234',
  mothers_maiden_name: 'Test Mother',
  valid_id_type: 'Passport',
  id_number: 'TEST123456'
};

// 🧪 TEST SCENARIOS - UNCOMMENT THE SCENARIO YOU WANT TO TEST
const SCENARIOS = {
  // Scenario 1: Exact Name Match (Same Person)
  exact_match: {
    description: 'Exact Name Match (Same Person)',
    data: { ...TEST_DATA, middle_name: 'Smith', phone_number: '09123456789' }
  },
  
  // Scenario 2: Same First/Last, Different Middle
  different_middle: {
    description: 'Same First/Last, Different Middle',
    data: { ...TEST_DATA, middle_name: 'Robert', phone_number: '09123456790' }
  },
  
  // Scenario 3: Same First/Last, No Middle
  no_middle: {
    description: 'Same First/Last, No Middle',
    data: { ...TEST_DATA, middle_name: '', phone_number: '09123456791' }
  },
  
  // Scenario 4: Completely Different Name
  different_name: {
    description: 'Completely Different Name',
    data: { ...TEST_DATA, first_name: 'Jane', last_name: 'Smith', middle_name: 'Marie', phone_number: '09123456792' }
  },
  
  // Scenario 5: Existing Phone Number (Should Block)
  existing_phone: {
    description: 'Existing Phone Number (Should Block)',
    data: { ...TEST_DATA, phone_number: '09795679098' } // Use an existing phone number
  }
};

// 🎯 SELECT YOUR TEST SCENARIO HERE
const SELECTED_SCENARIO = 'exact_match'; // Change this to test different scenarios
// Options: 'exact_match', 'different_middle', 'no_middle', 'different_name', 'existing_phone'

async function runTest() {
  const fetch = (await import('node-fetch')).default;
  
  const scenario = SCENARIOS[SELECTED_SCENARIO];
  const testData = scenario.data;
  
  console.log('🧪 Simple Duplicate Validation Test');
  console.log('====================================');
  console.log(`📋 Scenario: ${scenario.description}`);
  console.log(`👤 Name: ${testData.first_name} ${testData.middle_name} ${testData.last_name}`);
  console.log(`📱 Phone: ${testData.phone_number}`);
  console.log(`📧 Email: ${testData.email}`);
  console.log('');
  
  // Create test image file
  const testImagePath = './test-image.png';
  if (!fs.existsSync(testImagePath)) {
    fs.writeFileSync(testImagePath, 'dummy image data');
    console.log('📁 Created test image file');
  }
  
  const formData = new FormData();
  
  // Add all form fields
  Object.keys(testData).forEach(key => {
    formData.append(key, testData[key]);
  });
  
  // Add files
  formData.append('selfie', fs.createReadStream(testImagePath));
  formData.append('gov_id', fs.createReadStream(testImagePath));
  
  try {
    console.log('📤 Sending registration request...');
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      body: formData
    });
    
    console.log(`📥 Response status: ${response.status}`);
    
    if (response.status === 200) {
      const result = await response.json();
      console.log('✅ Registration allowed:', result.success);
      console.log('📝 Message:', result.message);
      
      if (result.userInfo && result.userInfo.duplicate_detected) {
        console.log('⚠️ Duplicate detected and flagged for review');
        console.log(`🔍 Is same person: ${result.userInfo.is_same_person}`);
        console.log(`🆔 Existing user ID: ${result.userInfo.existing_user_id}`);
      }
      
      console.log('\n🎯 Test completed successfully!');
    } else if (response.status === 400) {
      const result = await response.json();
      console.log('❌ Registration blocked:', result.error);
      console.log('📝 Message:', result.message);
      
      if (result.existingUser) {
        console.log('👤 Existing user found:', result.existingUser);
      }
      
      console.log('\n🎯 Test completed - Registration blocked as expected');
    } else {
      console.log('❌ Unexpected response status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
runTest().catch(console.error);

console.log('\n💡 To test different scenarios, change the SELECTED_SCENARIO variable above:');
console.log('   - exact_match: Same person, different phone');
console.log('   - different_middle: Same first/last, different middle name');
console.log('   - no_middle: Same first/last, no middle name');
console.log('   - different_name: Completely different name');
console.log('   - existing_phone: Existing phone number (should block)'); 