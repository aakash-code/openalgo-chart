import WebSocket from 'ws';

const apiKey = '8319156e5247816c4b8974d5e687fe24156e7f1a8c68fecba62be4fc1ba128ea';

const ws = new WebSocket('ws://127.0.0.1:8765', {
  headers: {
    origin: 'http://localhost:5001'
  }
});

ws.on('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({ action: 'authenticate', api_key: apiKey }));
});

ws.on('message', (data) => {
  console.log('Message:', data.toString());
});

ws.on('error', (err) => {
  console.error('Error:', err);
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString());
});

setTimeout(() => {
  console.log('Timing out...');
  ws.close();
  process.exit(0);
}, 5000);
