const express = require('express');
const app = express();
const PORT = 3000;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Root route
app.get('/', (req, res) => {
  console.log('✅ Root route accessed');
  res.json({ 
    message: 'Microfinance App Server is running!',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Test route
app.get('/test', (req, res) => {
  console.log('✅ Test route accessed');
  res.json({ 
    message: 'Test route working!',
    status: 'ok'
  });
});

app.use(express.json());

app.post('/test-otp', (req, res) => {
  console.log('Test OTP endpoint hit');
  res.json({ message: 'This is a JSON response' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Simple test server running at http://localhost:${PORT}`);
  console.log(`✅ Test the root route: http://localhost:${PORT}/`);
  console.log(`✅ Test the test route: http://localhost:${PORT}/test`);
  console.log('Test server running on port 3001');
}); 