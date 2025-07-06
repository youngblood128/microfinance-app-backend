console.log('Starting simple test...');

const http = require('http');

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Simple server works!' }));
  } else if (req.url === '/test-route') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Test route works!' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(3000, () => {
  console.log('Simple server running on port 3000');
  console.log('Server should stay running...');
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 