const http = require('http');

function testOTPVerification() {
  const data = JSON.stringify({
    otp: 'test123'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/verify-otp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', responseData);
      try {
        const jsonResponse = JSON.parse(responseData);
        console.log('✅ Response is valid JSON:', jsonResponse);
      } catch (err) {
        console.log('❌ Response is NOT valid JSON:', err.message);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Request error:', err);
  });

  req.write(data);
  req.end();
}

console.log('🧪 Testing OTP verification endpoint...');
testOTPVerification(); 