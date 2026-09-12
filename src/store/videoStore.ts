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
    youtubeUrl: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
    videoId: 'rfscVS0vtbw',
    title: 'Learn Python - Full Course for Beginners',
    description: 'Build a strong foundation in Python with a complete beginner-friendly course.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/rfscVS0vtbw/hqdefault.jpg',
    uploadDate: '2026-05-15',
    duration: '4:26:52',
    featured: true,
    status: 'Published',
    order: 1,
    createdAt: '2026-05-15',
  },
  {
    id: 'v2',
    youtubeUrl: 'https://www.youtube.com/watch?v=UB1O30fR-EE',
    videoId: 'UB1O30fR-EE',
    title: 'HTML Crash Course For Absolute Beginners',
    description: 'Learn the essential HTML building blocks for your next web project.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/UB1O30fR-EE/hqdefault.jpg',
    uploadDate: '2026-05-10',
    duration: '52:15',
    featured: true,
    status: 'Published',
    order: 2,
    createdAt: '2026-05-10',
  },
  {
    id: 'v3',
    youtubeUrl: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
    videoId: 'PkZNo7MFNFg',
    title: 'Learn JavaScript - Full Course for Beginners',
    description: 'Get started with JavaScript fundamentals through practical examples.',
    category: 'Web Development',
    thumbnail: 'https://img.youtube.com/vi/PkZNo7MFNFg/hqdefault.jpg',
    uploadDate: '2026-05-08',
    duration: '38:45',
    featured: true,
    status: 'Published',
    order: 3,
    createdAt: '2026-05-08',
  },
  {
    id: 'v4',
    youtubeUrl: 'https://www.youtube.com/watch?v=8mAITcNt710',
    videoId: '8mAITcNt710',
    title: 'Machine Learning Course for Beginners',
    description: 'Explore the core ideas behind machine learning with clear explanations.',
    category: 'AI/ML',
    thumbnail: 'https://img.youtube.com/vi/8mAITcNt710/hqdefault.jpg',
    uploadDate: '2026-05-05',
    duration: '41:20',
    featured: true,
    status: 'Published',
    order: 4,
    createdAt: '2026-05-05',
  },
  {
    id: 'v5',
    youtubeUrl: 'https://www.youtube.com/watch?v=RBSGKlAvoiM',
    videoId: 'RBSGKlAvoiM',
    title: 'Data Structures Easy to Advanced Course',
    description: 'Strengthen your problem-solving skills with essential data structures.',
    category: 'DSA',
    thumbnail: 'https://img.youtube.com/vi/RBSGKlAvoiM/hqdefault.jpg',
    uploadDate: '2026-05-01',
    duration: '22:10',
    featured: true,
    status: 'Published',
    order: 5,
    createdAt: '2026-05-01',
  },
  {
    id: 'v6',
    youtubeUrl: 'https://www.youtube.com/watch?v=u72H_zZzkcw',
    videoId: 'u72H_zZzkcw',
    title: 'Build a Developer Portfolio Website',
    description: 'Practical guidance for presenting your skills and projects online.',
    category: 'Career Guidance',
    thumbnail: 'https://img.youtube.com/vi/u72H_zZzkcw/hqdefault.jpg',
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
  {
    id: 'v9',
    youtubeUrl: 'https://www.youtube.com/watch?v=j9_t_cMwJjQ',
    videoId: 'j9_t_cMwJjQ',
    title: 'Complete JOSAA Counseling Process Explained',
    description: 'Step by step guide to engineering college admissions and choice filling.',
    category: 'Counseling',
    thumbnail: 'https://img.youtube.com/vi/j9_t_cMwJjQ/hqdefault.jpg',
    uploadDate: '2026-06-01',
    duration: '35:20',
    featured: true,
    status: 'Published',
    order: 9,
    createdAt: '2026-06-01',
  },
  {
    id: 'v10',
    youtubeUrl: 'https://www.youtube.com/watch?v=Vq7Zq7WwVqE',
    videoId: 'Vq7Zq7WwVqE',
    title: 'Top 10 Tips to Crack JEE Advanced',
    description: 'Master strategies, mindset, and study plan for JEE Advanced preparation.',
    category: 'JEE',
    thumbnail: 'https://img.youtube.com/vi/Vq7Zq7WwVqE/hqdefault.jpg',
    uploadDate: '2026-06-05',
    duration: '20:15',
    featured: true,
    status: 'Published',
    order: 10,
    createdAt: '2026-06-05',
  },
  {
    id: 'v11',
    youtubeUrl: 'https://www.youtube.com/watch?v=yW6W4q2D4Xo',
    videoId: 'yW6W4q2D4Xo',
    title: 'NEET Biology Rapid Revision in 1 Shot',
    description: 'Quick revision of entire Class 11 and 12 Biology syllabus for NEET aspirants.',
    category: 'NEET',
    thumbnail: 'https://img.youtube.com/vi/yW6W4q2D4Xo/hqdefault.jpg',
    uploadDate: '2026-06-10',
    duration: '11:45:30',
    featured: true,
    status: 'Published',
    order: 11,
    createdAt: '2026-06-10',
  },
  {
    id: 'v12',
    youtubeUrl: 'https://www.youtube.com/watch?v=9D2p6o8Hq4Y',
    videoId: '9D2p6o8Hq4Y',
    title: 'TCS NQT Quantitative Aptitude Questions',
    description: 'Solve the most commonly asked quantitative aptitude questions for placements.',
    category: 'Aptitude',
    thumbnail: 'https://img.youtube.com/vi/9D2p6o8Hq4Y/hqdefault.jpg',
    uploadDate: '2026-06-15',
    duration: '45:10',
    featured: true,
    status: 'Published',
    order: 12,
    createdAt: '2026-06-15',
  },
  {
    id: 'v13',
    youtubeUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
    videoId: 'kqtD5dpn9C8',
    title: 'How I Cracked FAANG SDE-1 Interview',
    description: 'My complete interview experience, coding questions asked, and prep strategy.',
    category: 'Interview Prep',
    thumbnail: 'https://img.youtube.com/vi/kqtD5dpn9C8/hqdefault.jpg',
    uploadDate: '2026-06-20',
    duration: '18:50',
    featured: true,
    status: 'Published',
    order: 13,
    createdAt: '2026-06-20',
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
