const fs = require('fs');

const validVideos = JSON.parse(fs.readFileSync('valid_videos.json', 'utf8'));

const categories = [
  'DSA', 'JEE', 'NEET', 'AI/ML', 'Counseling', 'Career Guidance', 
  'Interview Prep', 'Web Development', 'Python', 'Aptitude', 'Study Tips'
];

let videosString = `const seedVideos: YouTubeVideo[] = [\n`;

validVideos.slice(0, 13).forEach((v, index) => {
  const category = categories[index % categories.length];
  videosString += `  {
    id: 'v${index + 1}',
    youtubeUrl: 'https://youtu.be/${v.id}',
    videoId: '${v.id}',
    title: ${JSON.stringify(v.title)},
    description: ${JSON.stringify('A great video from Skills021 channel about ' + category + '.')},
    category: '${category}',
    thumbnail: 'https://img.youtube.com/vi/${v.id}/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: ${index + 1},
    createdAt: '2026-05-15',
  }${index < 12 ? ',' : ''}\n`;
});
videosString += `]`;

const tsContent = fs.readFileSync('src/store/videoStore.ts', 'utf8');
const before = tsContent.split('const seedVideos: YouTubeVideo[] = [')[0];
const after = tsContent.split('// ─── Store ──────────────────────────────────────────────────────────────────')[1];

fs.writeFileSync('src/store/videoStore.ts', before + videosString + '\n\n// ─── Store ──────────────────────────────────────────────────────────────────' + after);
console.log('Done!');
