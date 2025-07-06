const express = require('express');
const app = express();

// Test server to check routes
app.get('/test', (req, res) => {
  res.json({ message: 'Test route works!' });
});

app.post('/test-post', (req, res) => {
  res.json({ message: 'Test POST route works!' });
});

app.listen(3001, () => {
  console.log('Test server running on port 3001');
}); 