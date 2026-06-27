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
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

// ─── Seed Data ──────────────────────────────────────────────────────────────
const seedVideos: YouTubeVideo[] = [
  {
    id: 'v1',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    title: 'Complete DSA Mastery - Arrays & Strings',
    description: 'In this video, we cover the fundamentals of arrays and strings - two of the most important topics in DSA interviews.',
    category: 'DSA',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '45:30',
    featured: true,
    status: 'Published',
    order: 1,
    createdAt: '2026-05-15',
  },
  {
    id: 'v2',
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    videoId: 'jNQXAC9IVRw',
    title: 'JEE Mains 2026 - Physics Chapterwise Revision',
    description: 'Complete revision of Physics chapters with important formulas and numerical solutions for JEE Mains 2026.',
    category: 'JEE',
    thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
    uploadDate: '2026-05-10',
    duration: '52:15',
    featured: true,
    status: 'Published',
    order: 2,
    createdAt: '2026-05-10',
  },
  {
    id: 'v3',
    youtubeUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    videoId: '9bZkp7q19f0',
    title: 'NEET Biology - Human Body Systems Explained',
    description: 'Detailed explanation of all human body systems with diagrams and mnemonics for NEET preparation.',
    category: 'NEET',
    thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg',
    uploadDate: '2026-05-08',
    duration: '38:45',
    featured: true,
    status: 'Published',
    order: 3,
    createdAt: '2026-05-08',
  },
  {
    id: 'v4',
    youtubeUrl: 'https://www.youtube.com/watch?v=pTFZFxM0crU',
    videoId: 'pTFZFxM0crU',
    title: 'AI/ML Fundamentals - Linear Regression Explained',
    description: 'Learn linear regression from scratch with Python implementation and real-world applications.',
    category: 'AI/ML',
    thumbnail: 'https://img.youtube.com/vi/pTFZFxM0crU/maxresdefault.jpg',
    uploadDate: '2026-05-05',
    duration: '41:20',
    featured: false,
    status: 'Published',
    order: 4,
    createdAt: '2026-05-05',
  },
  {
    id: 'v5',
    youtubeUrl: 'https://www.youtube.com/watch?v=OPf0YbXqDm0',
    videoId: 'OPf0YbXqDm0',
    title: 'College Counseling - Choosing Right Stream & Institute',
    description: 'Expert counseling on how to choose the right stream (Engineering, Medical, Commerce) and institute based on your scores.',
    category: 'Counseling',
    thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/maxresdefault.jpg',
    uploadDate: '2026-05-01',
    duration: '33:10',
    featured: true,
    status: 'Published',
    order: 5,
    createdAt: '2026-05-01',
  },
  {
    id: 'v6',
    youtubeUrl: 'https://www.youtube.com/watch?v=vIQQR_yq-8I',
    videoId: 'vIQQR_yq-8I',
    title: 'Career Guidance - Roadmap to FAANG Companies',
    description: 'Complete roadmap to get hired by top FAANG companies with salary negotiation tips.',
    category: 'Career Guidance',
    thumbnail: 'https://img.youtube.com/vi/vIQQR_yq-8I/maxresdefault.jpg',
    uploadDate: '2026-04-28',
    duration: '27:50',
    featured: false,
    status: 'Published',
    order: 6,
    createdAt: '2026-04-28',
  },
  {
    id: 'v7',
    youtubeUrl: 'https://www.youtube.com/watch?v=xfBWVwuCBH8',
    videoId: 'xfBWVwuCBH8',
    title: 'Interview Prep - System Design for Beginners',
    description: 'Introduction to system design concepts crucial for senior engineer interviews.',
    category: 'Interview Prep',
    thumbnail: 'https://img.youtube.com/vi/xfBWVwuCBH8/maxresdefault.jpg',
    uploadDate: '2026-04-25',
    duration: '56:30',
    featured: false,
    status: 'Published',
    order: 7,
    createdAt: '2026-04-25',
  },
  {
    id: 'v8',
    youtubeUrl: 'https://www.youtube.com/watch?v=V9FXc_2BGpk',
    videoId: 'V9FXc_2BGpk',
    title: 'Web Development - React Hooks Deep Dive',
    description: 'Master React Hooks with practical examples and best practices.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/V9FXc_2BGpk/maxresdefault.jpg',
    uploadDate: '2026-04-20',
    duration: '48:15',
    featured: false,
    status: 'Published',
    order: 8,
    createdAt: '2026-04-20',
  },
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
    { name: 'skill021_videos' }
  )
)
