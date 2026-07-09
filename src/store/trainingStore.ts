import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type InternshipCategory = 'Summer Internship' | 'Winter Internship' | 'Virtual Internship' | 'Industrial Training' | 'Live Project' | 'Placement Training'

export interface Internship {
  id: string
  title: string
  company: string
  description: string
  category: InternshipCategory
  domain: string
  duration: string
  stipend: string | 'Unpaid'
  mode: 'Online' | 'Offline' | 'Hybrid'
  location?: string
  skills: string[]
  eligibility: string
  applicationDeadline: string
  startDate: string
  applyUrl?: string
  status: 'Published' | 'Draft'
  applications: number
  createdAt: string
}

interface TrainingState {
  internships: Internship[]
  addInternship: (i: Omit<Internship, 'id' | 'createdAt' | 'applications'>) => void
  updateInternship: (id: string, data: Partial<Internship>) => void
  deleteInternship: (id: string) => void
  toggleInternshipStatus: (id: string) => void
}

const seedInternships: Internship[] = [
  {
    id: 'i1', title: 'Web Development Internship', company: 'Skills021',
    description: 'Work on real-world web projects using React, Node.js and MongoDB. Get mentored by industry experts and build your portfolio.',
    category: 'Summer Internship', domain: 'Web Development', duration: '2 months',
    stipend: '₹5,000/month', mode: 'Online', skills: ['React', 'Node.js', 'MongoDB', 'REST APIs'],
    eligibility: 'B.Tech/BCA students (2nd year onwards)', applicationDeadline: '2025-07-31',
    startDate: '2025-08-15', applyUrl: '#', status: 'Published', applications: 340, createdAt: '2025-06-01',
  },
  {
    id: 'i2', title: 'Data Science & ML Internship', company: 'Skills021',
    description: 'Work on real ML models, data pipelines and analytics dashboards. Exposure to Python, scikit-learn, and TensorFlow.',
    category: 'Summer Internship', domain: 'AI & Machine Learning', duration: '3 months',
    stipend: '₹8,000/month', mode: 'Online', skills: ['Python', 'Machine Learning', 'Pandas', 'TensorFlow'],
    eligibility: 'B.Tech/BCA/B.Sc students', applicationDeadline: '2025-07-25',
    startDate: '2025-08-10', applyUrl: '#', status: 'Published', applications: 520, createdAt: '2025-06-01',
  },
  {
    id: 'i3', title: 'Flutter App Development Internship', company: 'Skills021',
    description: 'Build production-ready Flutter apps. Work with real clients and get your apps published on Play Store.',
    category: 'Virtual Internship', domain: 'App Development', duration: '2 months',
    stipend: '₹4,000/month', mode: 'Online', skills: ['Flutter', 'Dart', 'Firebase', 'REST APIs'],
    eligibility: 'Any student with Flutter basics', applicationDeadline: '2025-08-15',
    startDate: '2025-09-01', applyUrl: '#', status: 'Published', applications: 210, createdAt: '2025-06-15',
  },
  {
    id: 'i4', title: 'Digital Marketing & Content Internship', company: 'Skills021',
    description: 'Manage social media, create content, run ad campaigns, and learn SEO & growth hacking.',
    category: 'Virtual Internship', domain: 'Digital Marketing', duration: '1 month',
    stipend: '₹3,000/month', mode: 'Online', skills: ['Content Writing', 'SEO', 'Social Media', 'Analytics'],
    eligibility: 'Any undergraduate student', applicationDeadline: '2025-08-01',
    startDate: '2025-08-20', applyUrl: '#', status: 'Published', applications: 180, createdAt: '2025-07-01',
  },
  {
    id: 'i5', title: 'Industrial Training — Java Full Stack', company: 'Skills021 & TCS',
    description: '6-week industrial training on Java Full Stack development. Certificate from TCS and Skills021.',
    category: 'Industrial Training', domain: 'Web Development', duration: '6 weeks',
    stipend: 'Unpaid', mode: 'Hybrid', location: 'Noida', skills: ['Java', 'Spring Boot', 'React', 'MySQL'],
    eligibility: 'Final year B.Tech students', applicationDeadline: '2025-09-01',
    startDate: '2025-09-15', applyUrl: '#', status: 'Published', applications: 890, createdAt: '2025-07-10',
  },
]

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set) => ({
      internships: seedInternships,
      addInternship: (i) => set((s) => ({
        internships: [...s.internships, { ...i, id: `i-${Date.now()}`, applications: 0, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateInternship: (id, data) => set((s) => ({
        internships: s.internships.map((i) => i.id === id ? { ...i, ...data } : i)
      })),
      deleteInternship: (id) => set((s) => ({ internships: s.internships.filter((i) => i.id !== id) })),
      toggleInternshipStatus: (id) => set((s) => ({
        internships: s.internships.map((i) => i.id === id ? { ...i, status: i.status === 'Published' ? 'Draft' : 'Published' } : i)
      })),
    }),
    { name: 'skill021_training' }
  )
)
