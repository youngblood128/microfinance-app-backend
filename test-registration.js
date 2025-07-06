const FormData = require('form-data');
const fs = require('fs');

async function testRegistration() {
  const fetch = (await import('node-fetch')).default;
  
  console.log('🧪 Testing registration with existing phone number...');
  
  // Create a test image file (or use existing one)
  const testImagePath = './uploads/1751177895230-154509407.png';
  
  if (!fs.existsSync(testImagePath)) {
    console.log('❌ Test image not found, creating dummy file...');
    // Create a dummy file for testing
    fs.writeFileSync('./test-image.png', 'dummy image data');
  }
  
  const formData = new FormData();
  
  // Add form fields
  formData.append('last_name', 'Test');
  formData.append('first_name', 'User');
  formData.append('middle_name', 'Validation');
  formData.append('gender', 'Male');
  formData.append('civil_status', 'Single');
  formData.append('email', 'test@example.com');
  formData.append('phone_number', '09795679098'); // This is an existing phone number
  formData.append('country', 'Philippines');
  formData.append('province', 'Test Province');
  formData.append('city_municipality', 'Test City');
  formData.append('barangay', 'Test Barangay');
  formData.append('subdivision_address1', 'Test Address');
  formData.append('zipcode', '1234');
  formData.append('mothers_maiden_name', 'Test Mother');
  formData.append('valid_id_type', 'Passport');
  formData.append('id_number', 'TEST123456');
  
  // Add files
  const imagePath = fs.existsSync(testImagePath) ? testImagePath : './test-image.png';
  formData.append('selfie', fs.createReadStream(imagePath));
  formData.append('gov_id', fs.createReadStream(imagePath));
  
  try {
    console.log('📤 Sending registration request...');
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      body: formData
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);
    
    const result = await response.json();
    console.log('📥 Response body:', result);
    
    if (response.status === 400 && result.error === 'PHONE_EXISTS') {
      console.log('✅ Validation working correctly! Phone number already exists.');
      console.log('📱 Message:', result.message);
      console.log('👤 Existing user:', result.existingUser);
    } else if (response.ok && result.success) {
      console.log('❌ Validation failed! Registration proceeded when it should have been blocked.');
    } else {
      console.log('❌ Unexpected response:', result);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testRegistration(); 