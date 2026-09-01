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
    youtubeUrl: 'https://www.youtube.com/watch?v=8v8GZXGj5a8',
    videoId: '8v8GZXGj5a8',
    title: 'Control Flow | Lesson 6',
    description: 'Learn about Control Flow in this lecture of the complete Android App Development Full Course.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/8v8GZXGj5a8/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '15:30',
    featured: true,
    status: 'Published',
    order: 1,
    createdAt: '2026-05-15',
  },
  {
    id: 'v2',
    youtubeUrl: 'https://www.youtube.com/watch?v=OEftaFGGmjs',
    videoId: 'OEftaFGGmjs',
    title: 'Programming in C | IPU University',
    description: 'Learn C programming basics for IPU University syllabus.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/OEftaFGGmjs/hqdefault.jpg',
    uploadDate: '2026-05-10',
    duration: '52:15',
    featured: true,
    status: 'Published',
    order: 2,
    createdAt: '2026-05-10',
  },
  {
    id: 'v3',
    youtubeUrl: 'https://www.youtube.com/watch?v=ORKS1YEW1lI',
    videoId: 'ORKS1YEW1lI',
    title: 'Operators and Expressions in Kotlin | Lecture 5',
    description: 'Understand operators and expressions in Kotlin.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/ORKS1YEW1lI/hqdefault.jpg',
    uploadDate: '2026-05-08',
    duration: '38:45',
    featured: true,
    status: 'Published',
    order: 3,
    createdAt: '2026-05-08',
  },
  {
    id: 'v4',
    youtubeUrl: 'https://www.youtube.com/watch?v=6B7drSsw4F8',
    videoId: '6B7drSsw4F8',
    title: 'Variables & Data Types Explained | Lecture 4',
    description: 'Learn about variables and data types in Kotlin for Android Development.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/6B7drSsw4F8/hqdefault.jpg',
    uploadDate: '2026-05-05',
    duration: '41:20',
    featured: true,
    status: 'Published',
    order: 4,
    createdAt: '2026-05-05',
  },
  {
    id: 'v5',
    youtubeUrl: 'https://www.youtube.com/watch?v=VsMXX85VW_8',
    videoId: 'VsMXX85VW_8',
    title: 'Kotlin vs Java | Lecture 3',
    description: 'Detailed comparison between Kotlin and Java for Android development.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/VsMXX85VW_8/hqdefault.jpg',
    uploadDate: '2026-05-01',
    duration: '22:10',
    featured: true,
    status: 'Published',
    order: 5,
    createdAt: '2026-05-01',
  },
  {
    id: 'v6',
    youtubeUrl: 'https://www.youtube.com/watch?v=_BfTYQIbazg',
    videoId: '_BfTYQIbazg',
    title: 'Android Activity Lifecycle | Android Development Course | Lecture 2',
    description: 'Master the Android Activity Lifecycle with practical examples.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/_BfTYQIbazg/hqdefault.jpg',
    uploadDate: '2026-04-28',
    duration: '27:50',
    featured: true,
    status: 'Published',
    order: 6,
    createdAt: '2026-04-28',
  },
  {
    id: 'v7',
    youtubeUrl: 'https://www.youtube.com/watch?v=28BtfnlYaZ8',
    videoId: '28BtfnlYaZ8',
    title: 'Learn Android App Development in 2026 | Complete Course | Lecture 1',
    description: 'Introduction to Android development and environment setup.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/28BtfnlYaZ8/hqdefault.jpg',
    uploadDate: '2026-04-25',
    duration: '56:30',
    featured: true,
    status: 'Published',
    order: 7,
    createdAt: '2026-04-25',
  },
  {
    id: 'v8',
    youtubeUrl: 'https://www.youtube.com/watch?v=zKuP_-RuERA',
    videoId: 'zKuP_-RuERA',
    title: 'Most important questions on endogenic & exogenic forces | UGC NET Geography PYQs',
    description: 'UGC NET Geography PYQs on endogenic and exogenic forces.',
    category: 'Study Tips',
    thumbnail: 'https://img.youtube.com/vi/zKuP_-RuERA/hqdefault.jpg',
    uploadDate: '2026-04-20',
    duration: '48:15',
    featured: true,
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
    { name: 'skill021_videos_v3' }
  )
)
