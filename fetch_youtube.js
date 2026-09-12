import https from 'https';
import fs from 'fs';

https.get('https://www.youtube.com/@Skills021', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('youtube.html', data);
    console.log('done');
  });
}).on('error', (err) => {
  console.error('Error: ' + err.message);
});
