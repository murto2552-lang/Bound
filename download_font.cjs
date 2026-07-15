const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf';
const dest = path.join(__dirname, 'src', 'utils', 'Sarabun-Regular-normal.js');

const utilsDir = path.join(__dirname, 'src', 'utils');
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
}

https.get(url, (res) => {
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    // Handle redirect
    https.get(res.headers.location, (res2) => {
      processResponse(res2);
    }).on('error', (err) => console.error(err));
  } else {
    processResponse(res);
  }
}).on('error', (err) => {
  console.error('Error downloading font:', err);
});

function processResponse(res) {
  const data = [];
  res.on('data', (chunk) => {
    data.push(chunk);
  });
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    const base64 = buffer.toString('base64');
    const jsContent = `export const fontBase64 = "${base64}";`;
    fs.writeFileSync(dest, jsContent);
    console.log('Font downloaded and converted successfully!');
  });
}
