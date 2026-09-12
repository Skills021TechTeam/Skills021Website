const fs = require('fs');

const chosenVideos = [
  { id: '1A8T5kTpVPY', title: 'Engineering Karni Chahiye Ya Nahi? Complete Reality 2026 | Private vs Government College', category: 'Career Guidance' },
  { id: 'lNsRLrpu_xo', title: 'BIG SURPRISE FOR IPU STUDENTS! | IPU Career Course', category: 'Counseling' },
  { id: 'urkblXnhlPw', title: 'ECE Engineering Reality 2026 Scope, Salary, Placement & Semiconductor Future', category: 'Career Guidance' },
  { id: 'ugXqboHpzCA', title: 'Career Options After 12th Geography | High Salary Jobs & Future Scope 2026', category: 'Career Guidance' },
  { id: '28BtfnlYaZ8', title: 'Learn Android App Development in 2026 | Complete Course | Lecture 1', category: 'Web Development' },
  { id: 'LozNrUk5idg', title: 'M.Tech Counselling 2026 Explained in 45 Seconds! 🎓', category: 'Counseling' },
  { id: 'bOwOMwST5n4', title: '🎓 AKTU Counselling 2026 is Live!', category: 'Counseling' },
  { id: 'xCghHVJpvIY', title: 'AI vs Generative AI Explained Simply', category: 'AI/ML' },
  { id: 'qXkqUig3Oic', title: 'DevOps Kya Hai? 1 Minute Mein Samjho!', category: 'Web Development' },
  { id: 'vdSnIdndMZc', title: 'AKTU Counselling 2026 Students Must Watch!', category: 'Counseling' },
  { id: 'sQElXv1_D-k', title: 'Best College According To Your Rank 🚀 | AKTU Counselling', category: 'Counseling' },
  { id: 'jZ8Y68Hm7u0', title: '20 Lakh Rank aur CSE impossible lag raha hai?', category: 'Career Guidance' },
  { id: 'aA8s9XgQ02I', title: '🎓 IPU Students, Important Update!', category: 'Counseling' }
];

let videosString = `const seedVideos: YouTubeVideo[] = [\n`;

chosenVideos.forEach((v, index) => {
  videosString += `  {
    id: 'v${index + 1}',
    youtubeUrl: 'https://youtu.be/${v.id}',
    videoId: '${v.id}',
    title: ${JSON.stringify(v.title)},
    description: ${JSON.stringify('A great educational video from Skills021 channel about ' + v.category + '.')},
    category: '${v.category}',
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
console.log('Done replacing with filtered educational videos!');
