export interface AvatarPreset {
  id: string
  name: string
  category: '3d-personas' | 'illustrated' | 'cyber-bots' | 'fun-mascots'
  url: string
  description?: string
}

export interface AvatarCategory {
  id: '3d-personas' | 'illustrated' | 'cyber-bots' | 'fun-mascots'
  label: string
  iconEmoji: string
}

export const AVATAR_CATEGORIES: AvatarCategory[] = [
  { id: '3d-personas', label: '3D Personas', iconEmoji: '🌟' },
  { id: 'illustrated', label: 'Creative Avatars', iconEmoji: '🎨' },
  { id: 'cyber-bots', label: 'Cyber & Bots', iconEmoji: '⚡' },
  { id: 'fun-mascots', label: 'Fun Mascots', iconEmoji: '🚀' },
]

export const PRESET_AVATARS: AvatarPreset[] = [
  // ─── 3D Personas (DiceBear Notionists / Adventurer) ───
  {
    id: 'persona-alex',
    name: 'Alex (Fullstack Dev)',
    category: '3d-personas',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    description: 'Fullstack Engineer with modern glasses',
  },
  {
    id: 'persona-sophia',
    name: 'Sophia (AI Researcher)',
    category: '3d-personas',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sophia&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    description: 'AI Researcher & Data Scientist',
  },
  {
    id: 'persona-marcus',
    name: 'Marcus (Tech Lead)',
    category: '3d-personas',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Marcus&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    description: 'Tech Lead & System Architect',
  },
  {
    id: 'persona-zara',
    name: 'Zara (UI/UX Designer)',
    category: '3d-personas',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Zara&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    description: 'Product Designer & Design Systems',
  },
  {
    id: 'persona-kai',
    name: 'Kai (Frontend Hacker)',
    category: '3d-personas',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Kai&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    description: 'Frontend Creative & Animator',
  },
  {
    id: 'persona-maya',
    name: 'Maya (Cloud Architect)',
    category: '3d-personas',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Maya&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    description: 'DevOps & Cloud Infrastructure Pro',
  },
  {
    id: 'persona-leo',
    name: 'Leo (Mobile Specialist)',
    category: '3d-personas',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Leo&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    description: 'iOS & Android App Developer',
  },
  {
    id: 'persona-elena',
    name: 'Elena (Security Wizard)',
    category: '3d-personas',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Elena&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    description: 'Cybersecurity & Ethical Hacker',
  },

  // ─── Creative Avatars (DiceBear Lorelei & Adventurer) ───
  {
    id: 'creative-astro',
    name: 'Cosmo Explorer',
    category: 'illustrated',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Cosmo&backgroundColor=ffd5dc,d1d4f9,c0aede',
    description: 'Space-themed adventurous coder',
  },
  {
    id: 'creative-pixel',
    name: 'Pixel Knight',
    category: 'illustrated',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PixelKnight&backgroundColor=b6e3f4,ffd5dc',
    description: 'Retro game enthusiast and builder',
  },
  {
    id: 'creative-luna',
    name: 'Luna Coder',
    category: 'illustrated',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna&backgroundColor=b6e3f4,c0aede,ffd5dc',
    description: 'Vibrant modern developer',
  },
  {
    id: 'creative-felix',
    name: 'Felix the Builder',
    category: 'illustrated',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix&backgroundColor=d1d4f9,ffdfbf',
    description: 'Problem solver & algorithm master',
  },
  {
    id: 'creative-aria',
    name: 'Aria Spectrum',
    category: 'illustrated',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Aria&backgroundColor=ffdfbf,c0aede',
    description: 'Creative frontend developer',
  },
  {
    id: 'creative-ronin',
    name: 'Code Ronin',
    category: 'illustrated',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ronin&backgroundColor=ffd5dc,b6e3f4',
    description: 'Focused developer with warrior discipline',
  },

  // ─── Cyber & Bots (DiceBear Bottts) ───
  {
    id: 'bot-cyber-01',
    name: 'Cyber Sentinel',
    category: 'cyber-bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sentinel&backgroundColor=6366f1,3b82f6,06b6d4',
    description: 'High-tech AI droid guardian',
  },
  {
    id: 'bot-neon-spark',
    name: 'Neon Spark Bot',
    category: 'cyber-bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeonSpark&backgroundColor=10b981,06b6d4,8b5cf6',
    description: 'Fast quantum processing engine',
  },
  {
    id: 'bot-quantum-matrix',
    name: 'Quantum Core',
    category: 'cyber-bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumMatrix&backgroundColor=ec4899,8b5cf6,3b82f6',
    description: 'Advanced neural computing droid',
  },
  {
    id: 'bot-glitch-runner',
    name: 'Glitch Runner',
    category: 'cyber-bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GlitchRunner&backgroundColor=f59e0b,ef4444,6366f1',
    description: 'Cyberpunk cyberspace runner',
  },
  {
    id: 'bot-mecha-byte',
    name: 'Mecha Byte',
    category: 'cyber-bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=MechaByte&backgroundColor=06b6d4,3b82f6,10b981',
    description: 'Robotic automated compiler droid',
  },
  {
    id: 'bot-apex-droid',
    name: 'Apex Droid',
    category: 'cyber-bots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ApexDroid&backgroundColor=8b5cf6,ec4899,f59e0b',
    description: 'Elite debugging assistant',
  },

  // ─── Fun Mascots (DiceBear Fun-Emoji & Thumbs) ───
  {
    id: 'mascot-super-star',
    name: 'Superstar Spark',
    category: 'fun-mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=SuperStar&backgroundColor=ffd5dc,ffdfbf',
    description: 'Cheerful high-energy achiever',
  },
  {
    id: 'mascot-rocket-pro',
    name: 'Rocket Champion',
    category: 'fun-mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=RocketChamp&backgroundColor=b6e3f4,d1d4f9',
    description: 'Skyrocketing growth & knowledge',
  },
  {
    id: 'mascot-cool-glasses',
    name: 'Cool Guy Dev',
    category: 'fun-mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=CoolGlasses&backgroundColor=c0aede,ffd5dc',
    description: 'Always chill and bug-free',
  },
  {
    id: 'mascot-thumbs-up',
    name: 'Thumbs Up Ace',
    category: 'fun-mascots',
    url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=AceThumbs&backgroundColor=10b981,06b6d4',
    description: 'Ready to build and ship projects',
  },
  {
    id: 'mascot-happy-cat',
    name: 'Happy Code Cat',
    category: 'fun-mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=HappyCat&backgroundColor=ffdfbf,b6e3f4',
    description: 'Curious learner and midnight coder',
  },
  {
    id: 'mascot-fire-master',
    name: 'Fire Streak',
    category: 'fun-mascots',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=FireMaster&backgroundColor=ffd5dc,ffdfbf',
    description: 'On a continuous learning streak',
  },
]
