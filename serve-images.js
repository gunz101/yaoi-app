/**
 * Simple HTTP server to serve exercise images.
 * Run alongside Expo: node serve-images.js
 * Images will be available at http://<your-ip>:3333/exercises/Air_Bike/0.jpg
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3333;
const BASE_DIR = path.join(__dirname, 'assets', 'free-exercise-db', 'exercises');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const filePath = path.join(BASE_DIR, decodeURIComponent(req.url));
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n🖼️  Image server running at:`);
  console.log(`   http://${ip}:${PORT}/Air_Bike/0.jpg`);
  console.log(`\n   Serving from: ${BASE_DIR}\n`);
});
