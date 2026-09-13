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
    youtubeUrl: 'https://youtu.be/zUEk0phOFvg',
    videoId: 'zUEk0phOFvg',
    title: "Course Introduction Video",
    description: "A great educational video from Skills021 channel.",
    category: 'Study Tips',
    thumbnail: 'https://img.youtube.com/vi/zUEk0phOFvg/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 1,
    createdAt: '2026-05-15',
  },
  {
    id: 'v2',
    youtubeUrl: 'https://youtu.be/ypg-9JK0028',
    videoId: 'ypg-9JK0028',
    title: "Course Introduction Video",
    description: "A great educational video from Skills021 channel.",
    category: 'Study Tips',
    thumbnail: 'https://img.youtube.com/vi/ypg-9JK0028/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 2,
    createdAt: '2026-05-15',
  },
  {
    id: 'v3',
    youtubeUrl: 'https://youtu.be/lNsRLrpu_xo',
    videoId: 'lNsRLrpu_xo',
    title: "Get All This at Just ₹3.48/Day 😱| BIG SURPRISE FOR IPU STUDENTS! | IPU Career Course",
    description: "A great educational video from Skills021 channel.",
    category: 'Career Guidance',
    thumbnail: 'https://img.youtube.com/vi/lNsRLrpu_xo/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 3,
    createdAt: '2026-05-15',
  },
  {
    id: 'v4',
    youtubeUrl: 'https://youtu.be/dmOzr3lfa_k',
    videoId: 'dmOzr3lfa_k',
    title: "Course Introduction Video",
    description: "A great educational video from Skills021 channel.",
    category: 'Study Tips',
    thumbnail: 'https://img.youtube.com/vi/dmOzr3lfa_k/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 4,
    createdAt: '2026-05-15',
  },
  {
    id: 'v5',
    youtubeUrl: 'https://youtu.be/OEftaFGGmjs',
    videoId: 'OEftaFGGmjs',
    title: "Course Introduction Video",
    description: "A great educational video from Skills021 channel.",
    category: 'Study Tips',
    thumbnail: 'https://img.youtube.com/vi/OEftaFGGmjs/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 5,
    createdAt: '2026-05-15',
  },
  {
    id: 'v6',
    youtubeUrl: 'https://youtu.be/uXDAlmZU1LA',
    videoId: 'uXDAlmZU1LA',
    title: "Course Introduction Video",
    description: "A great educational video from Skills021 channel.",
    category: 'Study Tips',
    thumbnail: 'https://img.youtube.com/vi/uXDAlmZU1LA/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 6,
    createdAt: '2026-05-15',
  },
  {
    id: 'v7',
    youtubeUrl: 'https://youtu.be/CbaKaVN4c64',
    videoId: 'CbaKaVN4c64',
    title: "Career Guidance",
    description: "A great educational video from Skills021 channel.",
    category: 'Career Guidance',
    thumbnail: 'https://img.youtube.com/vi/CbaKaVN4c64/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 7,
    createdAt: '2026-05-15',
  },
  {
    id: 'v8',
    youtubeUrl: 'https://youtu.be/mvMwAZ1aPAs',
    videoId: 'mvMwAZ1aPAs',
    title: "Career Guidance",
    description: "A great educational video from Skills021 channel.",
    category: 'Career Guidance',
    thumbnail: 'https://img.youtube.com/vi/mvMwAZ1aPAs/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '10:00',
    featured: true,
    status: 'Published',
    order: 8,
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
    { name: 'skill021_videos_v5', version: 2 }
  )
)
