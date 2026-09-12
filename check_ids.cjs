const https = require('https');
const ids = [
  '1A8T5kTpVPY', 'MIohCA2EzaA', 'lNsRLrpu_xo', 'urkblXnhlPw', 'ugXqboHpzCA', 'RmFsf4XAzUU', '28BtfnlYaZ8',
  '4wZnqlphB6I', 'LgHLQNRzO38', 'fayrplVWFzA', 'JVwq1ybjV88', 'UmLFIIl6CSg', 'StUdaNVE0PQ', 'aA8s9XgQ02I',
  'eqNe6Qoq3oE', '0vE14mgKpEg', 'LozNrUk5idg', 'bOwOMwST5n4', 'xCghHVJpvIY', 'qXkqUig3Oic', 'vdSnIdndMZc',
  'sQElXv1_D-k', 'jZ8Y68Hm7u0', 'a7F8k_vPRPU', 'mFJCYCd4izE'
];

async function checkIds() {
  const valid = [];
  for (const id of ids) {
    try {
      const title = await new Promise((resolve, reject) => {
        https.get(`https://www.youtube.com/watch?v=${id}`, (res) => {
          if (res.statusCode !== 200) return resolve(null);
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            const match = data.match(/<title>(.*?) - YouTube<\/title>/);
            resolve(match ? match[1] : null);
          });
        }).on('error', () => resolve(null));
      });
      if (title && title !== 'YouTube') {
        valid.push({ id, title });
        console.log(id, title);
      }
    } catch (e) {}
  }
  const fs = require('fs');
  fs.writeFileSync('valid_videos.json', JSON.stringify(valid, null, 2));
}

checkIds();
