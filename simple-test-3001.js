const express = require('express');
const app = express();
const PORT = 3001;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Root route
app.get('/', (req, res) => {
  console.log('✅ Root route accessed on port 3001');
  res.json({ 
    message: 'Microfinance App Server is running on port 3001!',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Test route
app.get('/test', (req, res) => {
  console.log('✅ Test route accessed on port 3001');
  res.json({ 
    message: 'Test route working on port 3001!',
    status: 'ok'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Simple test server running at http://localhost:${PORT}`);
  console.log(`✅ Test the root route: http://localhost:${PORT}/`);
  console.log(`✅ Test the test route: http://localhost:${PORT}/test`);
}); 