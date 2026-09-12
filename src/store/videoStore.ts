import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── YouTube Video Types ────────────────────────────────────────────────────
export type VideoCategory =
  | 'DSA'
  | 'JEE'
  | 'NEET'
  | 'AI/ML'
  | 'Counseling'
  | 'Career Guidance'
  | 'Interview Prep'
  | 'Web Development'
  | 'Python'
  | 'Aptitude'
  | 'Study Tips'

export interface YouTubeVideo {
  id: string
  youtubeUrl: string
  videoId: string
  title: string
  description: string
  category: VideoCategory
  thumbnail: string
  uploadDate: string
  duration: string // e.g., "15:30"
  featured: boolean
  status: 'Published' | 'Draft'
  order: number // for custom ordering
  createdAt: string
}

// ─── State Interface ────────────────────────────────────────────────────────
interface VideoState {
  videos: YouTubeVideo[]

  // Video actions
  addVideo: (video: Omit<YouTubeVideo, 'id' | 'createdAt' | 'videoId' | 'thumbnail'>) => void
  updateVideo: (id: string, data: Partial<YouTubeVideo>) => void
  deleteVideo: (id: string) => void
  toggleVideoStatus: (id: string) => void
  toggleFeatured: (id: string) => void
  reorderVideos: (videos: YouTubeVideo[]) => void
  getPublishedVideos: () => YouTubeVideo[]
  getVideosByCategory: (category: VideoCategory) => YouTubeVideo[]
}

// ─── Helper: Extract Video ID from YouTube URL ──────────────────────────────
function extractYouTubeVideoId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match?.[1] || ''
}

// ─── Helper: Get YouTube Thumbnail URL ──────────────────────────────────────
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

// ─── Seed Data ──────────────────────────────────────────────────────────────
const seedVideos: YouTubeVideo[] = [
  {
    id: 'v1',
    youtubeUrl: 'https://youtu.be/1A8T5kTpVPY',
    videoId: '1A8T5kTpVPY',
    title: "Engineering Karni Chahiye Ya Nahi? Complete Reality 2026 | Private vs Government College",
    description: "A great educational video from Skills021 channel about Career Guidance.",
    category: 'Career Guidance',
    thumbnail: 'https://img.youtube.com/vi/1A8T5kTpVPY/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 1,
    createdAt: '2026-05-15',
  },
  {
    id: 'v2',
    youtubeUrl: 'https://youtu.be/lNsRLrpu_xo',
    videoId: 'lNsRLrpu_xo',
    title: "BIG SURPRISE FOR IPU STUDENTS! | IPU Career Course",
    description: "A great educational video from Skills021 channel about Counseling.",
    category: 'Counseling',
    thumbnail: 'https://img.youtube.com/vi/lNsRLrpu_xo/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 2,
    createdAt: '2026-05-15',
  },
  {
    id: 'v3',
    youtubeUrl: 'https://youtu.be/urkblXnhlPw',
    videoId: 'urkblXnhlPw',
    title: "ECE Engineering Reality 2026 Scope, Salary, Placement & Semiconductor Future",
    description: "A great educational video from Skills021 channel about Career Guidance.",
    category: 'Career Guidance',
    thumbnail: 'https://img.youtube.com/vi/urkblXnhlPw/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 3,
    createdAt: '2026-05-15',
  },
  {
    id: 'v4',
    youtubeUrl: 'https://youtu.be/ugXqboHpzCA',
    videoId: 'ugXqboHpzCA',
    title: "Career Options After 12th Geography | High Salary Jobs & Future Scope 2026",
    description: "A great educational video from Skills021 channel about Career Guidance.",
    category: 'Career Guidance',
    thumbnail: 'https://img.youtube.com/vi/ugXqboHpzCA/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 4,
    createdAt: '2026-05-15',
  },
  {
    id: 'v5',
    youtubeUrl: 'https://youtu.be/28BtfnlYaZ8',
    videoId: '28BtfnlYaZ8',
    title: "Learn Android App Development in 2026 | Complete Course | Lecture 1",
    description: "A great educational video from Skills021 channel about Web Development.",
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/28BtfnlYaZ8/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 5,
    createdAt: '2026-05-15',
  },
  {
    id: 'v6',
    youtubeUrl: 'https://youtu.be/LozNrUk5idg',
    videoId: 'LozNrUk5idg',
    title: "M.Tech Counselling 2026 Explained in 45 Seconds! 🎓",
    description: "A great educational video from Skills021 channel about Counseling.",
    category: 'Counseling',
    thumbnail: 'https://img.youtube.com/vi/LozNrUk5idg/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 6,
    createdAt: '2026-05-15',
  },
  {
    id: 'v7',
    youtubeUrl: 'https://youtu.be/bOwOMwST5n4',
    videoId: 'bOwOMwST5n4',
    title: "🎓 AKTU Counselling 2026 is Live!",
    description: "A great educational video from Skills021 channel about Counseling.",
    category: 'Counseling',
    thumbnail: 'https://img.youtube.com/vi/bOwOMwST5n4/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 7,
    createdAt: '2026-05-15',
  },
  {
    id: 'v8',
    youtubeUrl: 'https://youtu.be/xCghHVJpvIY',
    videoId: 'xCghHVJpvIY',
    title: "AI vs Generative AI Explained Simply",
    description: "A great educational video from Skills021 channel about AI/ML.",
    category: 'AI/ML',
    thumbnail: 'https://img.youtube.com/vi/xCghHVJpvIY/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 8,
    createdAt: '2026-05-15',
  },
  {
    id: 'v9',
    youtubeUrl: 'https://youtu.be/qXkqUig3Oic',
    videoId: 'qXkqUig3Oic',
    title: "DevOps Kya Hai? 1 Minute Mein Samjho!",
    description: "A great educational video from Skills021 channel about Web Development.",
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/qXkqUig3Oic/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 9,
    createdAt: '2026-05-15',
  },
  {
    id: 'v10',
    youtubeUrl: 'https://youtu.be/vdSnIdndMZc',
    videoId: 'vdSnIdndMZc',
    title: "AKTU Counselling 2026 Students Must Watch!",
    description: "A great educational video from Skills021 channel about Counseling.",
    category: 'Counseling',
    thumbnail: 'https://img.youtube.com/vi/vdSnIdndMZc/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 10,
    createdAt: '2026-05-15',
  },
  {
    id: 'v11',
    youtubeUrl: 'https://youtu.be/sQElXv1_D-k',
    videoId: 'sQElXv1_D-k',
    title: "Best College According To Your Rank 🚀 | AKTU Counselling",
    description: "A great educational video from Skills021 channel about Counseling.",
    category: 'Counseling',
    thumbnail: 'https://img.youtube.com/vi/sQElXv1_D-k/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 11,
    createdAt: '2026-05-15',
  },
  {
    id: 'v12',
    youtubeUrl: 'https://youtu.be/jZ8Y68Hm7u0',
    videoId: 'jZ8Y68Hm7u0',
    title: "20 Lakh Rank aur CSE impossible lag raha hai?",
    description: "A great educational video from Skills021 channel about Career Guidance.",
    category: 'Career Guidance',
    thumbnail: 'https://img.youtube.com/vi/jZ8Y68Hm7u0/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 12,
    createdAt: '2026-05-15',
  },
  {
    id: 'v13',
    youtubeUrl: 'https://youtu.be/aA8s9XgQ02I',
    videoId: 'aA8s9XgQ02I',
    title: "🎓 IPU Students, Important Update!",
    description: "A great educational video from Skills021 channel about Counseling.",
    category: 'Counseling',
    thumbnail: 'https://img.youtube.com/vi/aA8s9XgQ02I/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 13,
    createdAt: '2026-05-15',
  }
]

// ─── Store ──────────────────────────────────────────────────────────────────
export const useVideoStore = create<VideoState>()(
  persist(
    (set, get) => ({
      videos: seedVideos,

      addVideo: (video) => {
        const videoId = extractYouTubeVideoId(video.youtubeUrl)
        const thumbnail = getYouTubeThumbnail(videoId)
        const maxOrder = Math.max(...get().videos.map(v => v.order), 0)

        return set((s) => ({
          videos: [...s.videos, {
            ...video,
            id: `v-${Date.now()}`,
            videoId,
            thumbnail,
            order: maxOrder + 1,
            createdAt: new Date().toISOString().split('T')[0],
          }],
        }))
      },

      updateVideo: (id, data) => set((s) => ({
        videos: s.videos.map((v) => v.id === id ? { ...v, ...data } : v)
      })),

      deleteVideo: (id) => set((s) => ({
        videos: s.videos.filter((v) => v.id !== id)
      })),

      toggleVideoStatus: (id) => set((s) => ({
        videos: s.videos.map((v) => v.id === id ? { ...v, status: v.status === 'Published' ? 'Draft' : 'Published' } : v)
      })),

      toggleFeatured: (id) => set((s) => ({
        videos: s.videos.map((v) => v.id === id ? { ...v, featured: !v.featured } : v)
      })),

      reorderVideos: (videos) => set(() => ({ videos })),

      getPublishedVideos: () => {
        const videos = get().videos.filter(v => v.status === 'Published').sort((a, b) => a.order - b.order)
        return videos
      },

      getVideosByCategory: (category) => {
        return get().getPublishedVideos().filter(v => v.category === category)
      },
    }),
    { name: 'skill021_videos_v4', version: 1 }
  )
)
