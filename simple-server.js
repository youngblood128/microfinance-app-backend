const express = require('express');
const app = express();
const PORT = 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Simple test server running!' });
});

app.get('/test-route', (req, res) => {
  res.json({ message: 'Test route works!' });
});

app.post('/test-post', (req, res) => {
  res.json({ message: 'Test POST route works!' });
});

app.post('/register-form', (req, res) => {
  res.json({ message: 'Register form endpoint works!' });
});

app.listen(PORT, () => {
  console.log(`Simple test server running at http://localhost:${PORT}`);
}); 