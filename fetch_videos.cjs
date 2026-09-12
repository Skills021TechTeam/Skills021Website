const https = require('https');

https.get('https://www.youtube.com/@Skills021/videos', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // Regex to match "videoId":"12345678901","title":{"runs":[{"text":"Some title"}
    const matches = [...data.matchAll(/\"videoId\":\"([a-zA-Z0-9_-]{11})\",\"title\":\{\"runs\":\[\{\"text\":\"(.*?)\"\}/g)];
    const unique = [];
    const seen = new Set();
    for (const match of matches) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        unique.push({ id: match[1], title: match[2] });
      }
    }
    console.log(JSON.stringify(unique.slice(0, 15), null, 2));
  });
}).on('error', (err) => {
  console.error('Error: ' + err.message);
});
