import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Timestamp (chapter marker) ───────────────────────────────────────────────
export interface VideoTimestamp {
  id: string
  time: number
  label: string
}

// ─── Comment & Reply ──────────────────────────────────────────────────────────
export interface CommentReply {
  id: string
  userId: string
  userName: string
  text: string
  createdAt: string
}

export interface VideoComment {
  id: string
  videoId: string
  userId: string
  userName: string
  text: string
  createdAt: string
  replies: CommentReply[]
}

// ─── Video ────────────────────────────────────────────────────────────────────
export interface YouTubeVideo {
  id: string
  youtubeUrl: string
  videoId: string
  title: string
  description: string
  category: VideoCategory
  thumbnail: string
  uploadDate: string
  duration: string
  featured: boolean
  status: 'Published' | 'Draft'
  order: number
  createdAt: string
  timestamps: VideoTimestamp[]
}

// ─── State ────────────────────────────────────────────────────────────────────
interface VideoState {
  videos: YouTubeVideo[]
  comments: VideoComment[]

  addVideo: (video: Omit<YouTubeVideo, 'id' | 'createdAt' | 'videoId' | 'thumbnail' | 'timestamps'>) => void
  updateVideo: (id: string, data: Partial<YouTubeVideo>) => void
  deleteVideo: (id: string) => void
  toggleVideoStatus: (id: string) => void
  toggleFeatured: (id: string) => void
  reorderVideos: (videos: YouTubeVideo[]) => void

  addTimestamp: (videoId: string, ts: Omit<VideoTimestamp, 'id'>) => void
  updateTimestamp: (videoId: string, tsId: string, data: Partial<VideoTimestamp>) => void
  deleteTimestamp: (videoId: string, tsId: string) => void

  addComment: (videoId: string, userId: string, userName: string, text: string) => void
  deleteComment: (commentId: string) => void
  addReply: (commentId: string, userId: string, userName: string, text: string) => void
  deleteReply: (commentId: string, replyId: string) => void
  getVideoComments: (videoId: string) => VideoComment[]

  getPublishedVideos: () => YouTubeVideo[]
  getVideosByCategory: (category: VideoCategory) => YouTubeVideo[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function extractYouTubeVideoId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match?.[1] || ''
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const seedVideos: YouTubeVideo[] = [
  {
    id: 'v1',
    youtubeUrl: '/dsa-video.mp4',
    videoId: 'local-dsa',
    title: 'Complete DSA with Java',
    description: 'Complete DSA course with Java covering all important topics from basics to advanced level.',
    category: 'DSA',
    thumbnail: '',
    uploadDate: '2026-06-29',
    duration: '60:00',
    featured: true,
    status: 'Published',
    order: 1,
    createdAt: '2026-06-29',
    timestamps: [
      { id: 'ts1', time: 0, label: 'Intro' },
      { id: 'ts2', time: 10, label: 'First Stamp' },
      { id: 'ts3', time: 60, label: 'Second' },
    ],
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
    timestamps: [
      { id: 'ts5', time: 0, label: 'Mechanics' },
      { id: 'ts6', time: 600, label: 'Thermodynamics' },
      { id: 'ts7', time: 1500, label: 'Electrostatics' },
    ],
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
    timestamps: [],
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
    timestamps: [],
  },
  {
    id: 'v5',
    youtubeUrl: 'https://www.youtube.com/watch?v=OPf0YbXqDm0',
    videoId: 'OPf0YbXqDm0',
    title: 'College Counseling - Choosing Right Stream & Institute',
    description: 'Expert counseling on how to choose the right stream and institute based on your scores.',
    category: 'Counseling',
    thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/maxresdefault.jpg',
    uploadDate: '2026-05-01',
    duration: '33:10',
    featured: true,
    status: 'Published',
    order: 5,
    createdAt: '2026-05-01',
    timestamps: [],
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
    timestamps: [],
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
    timestamps: [],
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
    timestamps: [],
  },
]

// ─── Store ────────────────────────────────────────────────────────────────────
export const useVideoStore = create<VideoState>()(
  persist(
    (set, get) => ({
      videos: seedVideos,
      comments: [],

      addVideo: (video) => {
        const videoId = extractYouTubeVideoId(video.youtubeUrl)
        const thumbnail = getYouTubeThumbnail(videoId)
        const maxOrder = Math.max(...get().videos.map(v => v.order), 0)
        set((s) => ({
          videos: [...s.videos, {
            ...video,
            id: `v-${Date.now()}`,
            videoId,
            thumbnail,
            order: maxOrder + 1,
            timestamps: [],
            createdAt: new Date().toISOString().split('T')[0],
          }],
        }))
      },

      updateVideo: (id, data) => set((s) => ({
        videos: s.videos.map((v) => v.id === id ? { ...v, ...data } : v)
      })),

      deleteVideo: (id) => set((s) => ({
        videos: s.videos.filter((v) => v.id !== id),
        comments: s.comments.filter(c => c.videoId !== id),
      })),

      toggleVideoStatus: (id) => set((s) => ({
        videos: s.videos.map((v) => v.id === id ? { ...v, status: v.status === 'Published' ? 'Draft' : 'Published' } : v)
      })),

      toggleFeatured: (id) => set((s) => ({
        videos: s.videos.map((v) => v.id === id ? { ...v, featured: !v.featured } : v)
      })),

      reorderVideos: (videos) => set(() => ({ videos })),

      addTimestamp: (videoId, ts) => set((s) => ({
        videos: s.videos.map(v =>
          v.id === videoId
            ? { ...v, timestamps: [...v.timestamps, { ...ts, id: `ts-${Date.now()}` }].sort((a, b) => a.time - b.time) }
            : v
        )
      })),

      updateTimestamp: (videoId, tsId, data) => set((s) => ({
        videos: s.videos.map(v =>
          v.id === videoId
            ? { ...v, timestamps: v.timestamps.map(t => t.id === tsId ? { ...t, ...data } : t).sort((a, b) => a.time - b.time) }
            : v
        )
      })),

      deleteTimestamp: (videoId, tsId) => set((s) => ({
        videos: s.videos.map(v =>
          v.id === videoId
            ? { ...v, timestamps: v.timestamps.filter(t => t.id !== tsId) }
            : v
        )
      })),

      addComment: (videoId, userId, userName, text) => set((s) => ({
        comments: [...s.comments, {
          id: `c-${Date.now()}`,
          videoId,
          userId,
          userName,
          text,
          createdAt: new Date().toISOString(),
          replies: [],
        }]
      })),

      deleteComment: (commentId) => set((s) => ({
        comments: s.comments.filter(c => c.id !== commentId)
      })),

      addReply: (commentId, userId, userName, text) => set((s) => ({
        comments: s.comments.map(c =>
          c.id === commentId
            ? {
                ...c,
                replies: [...c.replies, {
                  id: `r-${Date.now()}`,
                  userId,
                  userName,
                  text,
                  createdAt: new Date().toISOString(),
                }]
              }
            : c
        )
      })),

      deleteReply: (commentId, replyId) => set((s) => ({
        comments: s.comments.map(c =>
          c.id === commentId
            ? { ...c, replies: c.replies.filter(r => r.id !== replyId) }
            : c
        )
      })),

      getVideoComments: (videoId) => {
        return get().comments
          .filter(c => c.videoId === videoId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      },

      getPublishedVideos: () => {
        return get().videos.filter(v => v.status === 'Published').sort((a, b) => a.order - b.order)
      },

      getVideosByCategory: (category) => {
        return get().getPublishedVideos().filter(v => v.category === category)
      },
    }),
    {
      name: 'skill021_videos_v2',
    }
  )
)
