const fs = require('fs');
const html = fs.readFileSync('youtube.html', 'utf8');

// A better way to get videos from ytInitialData
const initialDataMatch = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
if (initialDataMatch) {
  const ytInitialData = JSON.parse(initialDataMatch[1]);
  const videos = [];
  
  // Recursively find videoRenderer
  function findVideos(obj) {
    if (Array.isArray(obj)) {
      for (const item of obj) findVideos(item);
    } else if (obj !== null && typeof obj === 'object') {
      if (obj.gridVideoRenderer) {
        videos.push({
          id: obj.gridVideoRenderer.videoId,
          title: obj.gridVideoRenderer.title.runs[0].text
        });
      } else if (obj.videoRenderer) {
        videos.push({
          id: obj.videoRenderer.videoId,
          title: obj.videoRenderer.title.runs[0].text
        });
      } else if (obj.richItemRenderer && obj.richItemRenderer.content.videoRenderer) {
          const vr = obj.richItemRenderer.content.videoRenderer;
          videos.push({
              id: vr.videoId,
              title: vr.title.runs[0].text
          });
      }
      for (const key in obj) {
        findVideos(obj[key]);
      }
    }
  }
  
  findVideos(ytInitialData);
  const uniqueVideos = [];
  const seen = new Set();
  for (const v of videos) {
    if (!seen.has(v.id)) {
      seen.add(v.id);
      uniqueVideos.push(v);
    }
  }
  console.log(JSON.stringify(uniqueVideos.slice(0, 15), null, 2));
} else {
  console.log('ytInitialData not found');
}
