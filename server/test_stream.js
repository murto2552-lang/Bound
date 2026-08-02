const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      process.env[match[1]] = (match[2] || '').trim();
    }
  });
}

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key loaded:', apiKey ? apiKey.substring(0, 12) + '...' : 'NONE');

// Quick streaming test
async function testStream() {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: 1 }, 'bound-super-secret-key-2026', { expiresIn: '7d' });
  
  const res = await fetch('http://localhost:3000/v1/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ message: 'สวัสดี' })
  });
  
  console.log('Content-Type:', res.headers.get('content-type'));
  
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let chunks = 0;
  let fullText = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks++;
    const text = decoder.decode(value, { stream: true });
    fullText += text;
    if (chunks <= 3) console.log(`--- Chunk ${chunks} ---\n${text.substring(0, 200)}`);
  }
  
  console.log('\nTotal chunks:', chunks);
  console.log('Full response length:', fullText.length, 'bytes');
}

testStream().catch(console.error);
