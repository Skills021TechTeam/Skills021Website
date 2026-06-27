import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Course Types ───────────────────────────────────────────────────────────
export type CourseGroup = 'Foundation Programs' | 'Competitive Exams' | 'College & Tech Courses'
export type CourseSubcategory =
  | 'Class 1-5' | 'Class 6-8' | 'Class 9-10' | 'Class 11-12'
  | 'JEE Preparation' | 'NEET Preparation' | 'CUET Preparation' | 'Olympiads' | 'NTSE'
  | 'DSA' | 'Web Development' | 'App Development' | 'Flutter Development'
  | 'AI & Machine Learning' | 'Data Science' | 'Cyber Security' | 'Cloud Computing'
  | 'Aptitude Preparation' | 'Interview Preparation'

export interface CourseModule {
  id: string
  title: string
  lessons: { id: string; title: string; duration: string; videoUrl?: string; pdfUrl?: string }[]
}

export interface Course {
  id: string
  title: string
  description: string
  group: CourseGroup
  subcategory: CourseSubcategory
  instructor: string
  duration: string
  lectures: number
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  rating: number
  reviews: number
  price: number | 'FREE'
  tags: string[]
  thumbnail?: string
  videoUrl?: string
  modules: CourseModule[]
  status: 'Published' | 'Draft'
  enrolled: number
  gradientFrom: string
  gradientTo: string
  createdAt: string
}

// ─── Resource Types ─────────────────────────────────────────────────────────
export type ResourceType =
  | 'Notes' | 'Roadmaps' | 'Previous Year Papers' | 'Quizzes'
  | 'Practice Sheets' | 'E-Books' | 'Cheat Sheets' | 'Interview Questions'
  | 'Coding Resources' | 'Career Resources' | 'Worksheets' | 'Formula Sheets'
  | 'Mock Tests' | 'Project Ideas' | 'Revision Notes'

export type ResourceCategory =
  | 'Class 1-5' | 'Class 6-8' | 'Class 9-10' | 'Class 11-12'
  | 'JEE' | 'NEET' | 'CUET' | 'Olympiads'
  | 'DSA' | 'Web Development' | 'Flutter' | 'AI/ML' | 'Data Science' | 'Cyber Security' | 'Cloud Computing'
  | 'JoSAA' | 'AKTU' | 'IPU' | 'JAC Delhi' | 'NEET Counseling' | 'LPU' | 'VIT' | 'BITS'

export interface Resource {
  id: string
  title: string
  description: string
  type: ResourceType
  category: ResourceCategory
  author: string
  lastUpdated: string
  thumbnail?: string
  downloadUrl?: string
  isPremium: boolean
  price?: number
  status: 'Published' | 'Draft'
  downloads: number
  bookmarks: number
  createdAt: string
}

// ─── Quiz Types ──────────────────────────────────────────────────────────────
export type QuizCategory = 'School' | 'JEE' | 'NEET' | 'Aptitude' | 'DSA' | 'Programming'

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export interface Quiz {
  id: string
  title: string
  description: string
  category: QuizCategory
  difficulty: 'Easy' | 'Medium' | 'Hard'
  timeLimit: number // minutes
  questions: QuizQuestion[]
  isPremium: boolean
  status: 'Published' | 'Draft'
  participants: number
  maxScore: number
  createdAt: string
}

// ─── Roadmap Types ──────────────────────────────────────────────────────────
export interface RoadmapStep {
  id: string
  title: string
  description: string
  resources: string[]
  estimatedTime: string
  level: 'Foundation' | 'Intermediate' | 'Advanced'
}

export interface Roadmap {
  id: string
  title: string
  description: string
  category: string
  steps: RoadmapStep[]
  thumbnail?: string
  totalDuration: string
  status: 'Published' | 'Draft'
  views: number
  createdAt: string
}

// ─── State Interface ─────────────────────────────────────────────────────────
interface ContentState {
  courses: Course[]
  resources: Resource[]
  quizzes: Quiz[]
  roadmaps: Roadmap[]

  // Course actions
  addCourse: (course: Omit<Course, 'id' | 'createdAt'>) => void
  updateCourse: (id: string, data: Partial<Course>) => void
  deleteCourse: (id: string) => void
  toggleCourseStatus: (id: string) => void

  // Resource actions
  addResource: (resource: Omit<Resource, 'id' | 'createdAt' | 'downloads' | 'bookmarks'>) => void
  updateResource: (id: string, data: Partial<Resource>) => void
  deleteResource: (id: string) => void
  toggleResourceStatus: (id: string) => void

  // Quiz actions
  addQuiz: (quiz: Omit<Quiz, 'id' | 'createdAt' | 'participants'>) => void
  updateQuiz: (id: string, data: Partial<Quiz>) => void
  deleteQuiz: (id: string) => void
  toggleQuizStatus: (id: string) => void

  // Roadmap actions
  addRoadmap: (roadmap: Omit<Roadmap, 'id' | 'createdAt' | 'views'>) => void
  updateRoadmap: (id: string, data: Partial<Roadmap>) => void
  deleteRoadmap: (id: string) => void
  toggleRoadmapStatus: (id: string) => void
}

// ─── Seed Data ───────────────────────────────────────────────────────────────
const seedCourses: Course[] = [
  {
    id: 'c1', title: 'Complete DSA with Java', description: 'Master Data Structures & Algorithms from scratch to advanced level. Covers Arrays, Linked Lists, Trees, Graphs, DP and more.',
    group: 'College & Tech Courses', subcategory: 'DSA', instructor: 'Skills021 Team',
    duration: '80 hours', lectures: 240, level: 'Intermediate', rating: 4.9, reviews: 1200,
    price: 999, tags: ['DSA', 'Java', 'Algorithms'], modules: [], status: 'Published',
    enrolled: 4500, gradientFrom: '#6C63FF', gradientTo: '#00BFA6', createdAt: '2025-01-15',
    videoUrl: 'https://www.youtube.com/@skills021',
  },
  {
    id: 'c2', title: 'Full Stack Web Development', description: 'Build modern web apps with React, Node.js, MongoDB. Learn from basics to deployment.',
    group: 'College & Tech Courses', subcategory: 'Web Development', instructor: 'Skills021 Team',
    duration: '120 hours', lectures: 360, level: 'Beginner', rating: 4.8, reviews: 980,
    price: 1499, tags: ['React', 'Node', 'MongoDB'], modules: [], status: 'Published',
    enrolled: 3200, gradientFrom: '#FF6B6B', gradientTo: '#FFE66D', createdAt: '2025-02-01',
    videoUrl: 'https://www.youtube.com/@skills021',
  },
  {
    id: 'c3', title: 'JEE Mains & Advanced Complete', description: 'Comprehensive JEE preparation with Physics, Chemistry & Maths. Includes mock tests and PYQs.',
    group: 'Competitive Exams', subcategory: 'JEE Preparation', instructor: 'Skills021 Team',
    duration: '200 hours', lectures: 600, level: 'Advanced', rating: 4.9, reviews: 2100,
    price: 2999, tags: ['JEE', 'Physics', 'Chemistry', 'Maths'], modules: [], status: 'Published',
    enrolled: 8900, gradientFrom: '#4ECDC4', gradientTo: '#556270', createdAt: '2025-01-10',
    videoUrl: 'https://www.youtube.com/@skills021',
  },
  {
    id: 'c4', title: 'NEET Biology Masterclass', description: 'Complete Biology for NEET with NCERT analysis, PYQs and short notes.',
    group: 'Competitive Exams', subcategory: 'NEET Preparation', instructor: 'Skills021 Team',
    duration: '150 hours', lectures: 450, level: 'Intermediate', rating: 4.7, reviews: 1600,
    price: 'FREE', tags: ['NEET', 'Biology', 'NCERT'], modules: [], status: 'Published',
    enrolled: 12000, gradientFrom: '#A8E6CF', gradientTo: '#3D9970', createdAt: '2025-01-20',
    videoUrl: 'https://www.youtube.com/@skills021',
  },
  {
    id: 'c5', title: 'Flutter App Development', description: 'Build beautiful cross-platform apps with Flutter and Dart. From zero to Play Store.',
    group: 'College & Tech Courses', subcategory: 'Flutter Development', instructor: 'Skills021 Team',
    duration: '60 hours', lectures: 180, level: 'Beginner', rating: 4.8, reviews: 540,
    price: 799, tags: ['Flutter', 'Dart', 'Mobile'], modules: [], status: 'Published',
    enrolled: 2100, gradientFrom: '#667EEA', gradientTo: '#764BA2', createdAt: '2025-03-01',
    videoUrl: 'https://www.youtube.com/@skills021',
  },
  {
    id: 'c6', title: 'Class 10 Science & Maths', description: 'Complete CBSE Class 10 preparation with chapter-wise videos, notes and practice tests.',
    group: 'Foundation Programs', subcategory: 'Class 9-10', instructor: 'Skills021 Team',
    duration: '90 hours', lectures: 270, level: 'Beginner', rating: 4.6, reviews: 850,
    price: 'FREE', tags: ['Class 10', 'CBSE', 'Science', 'Maths'], modules: [], status: 'Published',
    enrolled: 15000, gradientFrom: '#F093FB', gradientTo: '#F5576C', createdAt: '2025-02-15',
    videoUrl: 'https://www.youtube.com/@skills021',
  },
  {
    id: 'c7', title: 'AI & Machine Learning with Python', description: 'Learn ML from scratch — regression, classification, neural networks, and deployment.',
    group: 'College & Tech Courses', subcategory: 'AI & Machine Learning', instructor: 'Skills021 Team',
    duration: '100 hours', lectures: 300, level: 'Intermediate', rating: 4.9, reviews: 720,
    price: 1299, tags: ['AI', 'ML', 'Python', 'TensorFlow'], modules: [], status: 'Published',
    enrolled: 3600, gradientFrom: '#4776E6', gradientTo: '#8E54E9', createdAt: '2025-03-10',
    videoUrl: 'https://www.youtube.com/@skills021',
  },
  {
    id: 'c8', title: 'Interview Preparation Bootcamp', description: 'Crack product-based company interviews with DSA, system design, and behavioral rounds.',
    group: 'College & Tech Courses', subcategory: 'Interview Preparation', instructor: 'Skills021 Team',
    duration: '40 hours', lectures: 120, level: 'Advanced', rating: 4.9, reviews: 1900,
    price: 599, tags: ['Interview', 'DSA', 'System Design'], modules: [], status: 'Published',
    enrolled: 7200, gradientFrom: '#f7971e', gradientTo: '#ffd200', createdAt: '2025-02-20',
    videoUrl: 'https://www.youtube.com/@skills021',
  },
]

const seedResources: Resource[] = [
  { id: 'r1', title: 'DSA Cheat Sheet — Complete', description: 'One-page cheat sheet covering all major DSA patterns and time complexities.', type: 'Cheat Sheets', category: 'DSA', author: 'Skills021 Team', lastUpdated: '2026-05-01', isPremium: false, status: 'Published', downloads: 8900, bookmarks: 340, createdAt: '2025-12-01', downloadUrl: '#' },
  { id: 'r2', title: 'JEE Mains PYQs 2024-2020', description: 'Solved previous year questions for JEE Mains 2020-2024 with detailed solutions.', type: 'Previous Year Papers', category: 'JEE', author: 'Skills021 Team', lastUpdated: '2026-04-15', isPremium: false, status: 'Published', downloads: 25000, bookmarks: 1200, createdAt: '2026-01-01', downloadUrl: '#' },
  { id: 'r3', title: 'Software Engineer Roadmap 2025', description: 'Step-by-step roadmap to become a software engineer with resources for each stage.', type: 'Roadmaps', category: 'DSA', author: 'Skills021 Team', lastUpdated: '2026-03-20', isPremium: false, status: 'Published', downloads: 12000, bookmarks: 890, createdAt: '2025-11-15', downloadUrl: '#' },
  { id: 'r4', title: 'NEET Biology Formula Book', description: 'Complete biology formula and reaction book for NEET preparation.', type: 'Formula Sheets', category: 'NEET', author: 'Skills021 Team', lastUpdated: '2026-02-10', isPremium: true, price: 99, status: 'Published', downloads: 4500, bookmarks: 230, createdAt: '2026-01-05', downloadUrl: '#' },
  { id: 'r5', title: 'Web Dev Interview Questions (500+)', description: '500+ commonly asked web development interview questions with answers.', type: 'Interview Questions', category: 'Web Development', author: 'Skills021 Team', lastUpdated: '2026-05-10', isPremium: false, status: 'Published', downloads: 18000, bookmarks: 1100, createdAt: '2025-10-01', downloadUrl: '#' },
  { id: 'r6', title: 'Class 10 Science Notes CBSE', description: 'Chapter-wise detailed notes for Class 10 Science — Physics, Chemistry, Biology.', type: 'Notes', category: 'Class 9-10', author: 'Skills021 Team', lastUpdated: '2026-01-20', isPremium: false, status: 'Published', downloads: 32000, bookmarks: 2100, createdAt: '2025-09-01', downloadUrl: '#' },
  { id: 'r7', title: 'Python Cheat Sheet (Beginner to Advanced)', description: 'Comprehensive Python cheat sheet with syntax, examples and common libraries.', type: 'Cheat Sheets', category: 'Data Science', author: 'Skills021 Team', lastUpdated: '2026-04-01', isPremium: false, status: 'Published', downloads: 21000, bookmarks: 1500, createdAt: '2025-08-15', downloadUrl: '#' },
  { id: 'r8', title: 'JoSAA Counseling Complete Guide 2025', description: 'Step-by-step JoSAA counseling guide with seat matrix, cutoffs and choice filling tips.', type: 'Roadmaps', category: 'JoSAA', author: 'Skills021 Team', lastUpdated: '2026-05-20', isPremium: true, price: 149, status: 'Published', downloads: 6700, bookmarks: 420, createdAt: '2026-02-01', downloadUrl: '#' },
]

const seedQuizzes: Quiz[] = [
  {
    id: 'q1', title: 'DSA Fundamentals Quiz', description: 'Test your knowledge of basic data structures and algorithms.',
    category: 'DSA', difficulty: 'Medium', timeLimit: 20, isPremium: false, status: 'Published',
    participants: 3400, maxScore: 100, createdAt: '2025-12-01',
    questions: [
      { id: 'qq1', question: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correctIndex: 1, explanation: 'Binary search divides the search space in half each step.' },
      { id: 'qq2', question: 'Which data structure is used for BFS?', options: ['Stack', 'Queue', 'Heap', 'Tree'], correctIndex: 1, explanation: 'BFS uses a Queue (FIFO) to process nodes level by level.' },
      { id: 'qq3', question: 'What is the worst case time complexity of QuickSort?', options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], correctIndex: 2, explanation: 'QuickSort worst case is O(n²) when pivot is always min/max.' },
    ],
  },
  {
    id: 'q2', title: 'JEE Physics — Mechanics', description: 'MCQs on Kinematics, Laws of Motion, and Work-Energy theorem.',
    category: 'JEE', difficulty: 'Hard', timeLimit: 30, isPremium: false, status: 'Published',
    participants: 5600, maxScore: 100, createdAt: '2026-01-10',
    questions: [
      { id: 'qq4', question: 'A ball is thrown vertically upward with velocity 20 m/s. Max height reached is?', options: ['10 m', '20 m', '30 m', '40 m'], correctIndex: 1, explanation: 'h = v²/2g = 400/20 = 20 m' },
      { id: 'qq5', question: 'Newton\'s second law is F = ma. If F=0, the body:', options: ['Accelerates', 'Decelerates', 'Remains in current state', 'Stops'], correctIndex: 2, explanation: 'F=0 means a=0, so body continues at same velocity (Newton\'s 1st law).' },
    ],
  },
  {
    id: 'q3', title: 'Aptitude — Logical Reasoning', description: 'Common placement aptitude questions on logical reasoning.',
    category: 'Aptitude', difficulty: 'Easy', timeLimit: 15, isPremium: false, status: 'Published',
    participants: 8900, maxScore: 100, createdAt: '2026-02-01',
    questions: [
      { id: 'qq6', question: 'If all roses are flowers and all flowers are plants, then:', options: ['All plants are roses', 'All roses are plants', 'Some plants are roses', 'None of these'], correctIndex: 1, explanation: 'By transitive relation: roses → flowers → plants, so all roses are plants.' },
    ],
  },
]

const seedRoadmaps: Roadmap[] = [
  {
    id: 'rm1', title: 'Become a Software Engineer', description: 'Complete roadmap to land your first software engineering job at a top company.',
    category: 'Tech Career', totalDuration: '12-18 months', status: 'Published', views: 45000,
    createdAt: '2025-10-01', thumbnail: '',
    steps: [
      { id: 's1', title: 'Programming Fundamentals', description: 'Learn a programming language (Python/Java/C++). Understand variables, loops, functions, OOP.', resources: ['CS50', 'Java Basics Course'], estimatedTime: '2-3 months', level: 'Foundation' },
      { id: 's2', title: 'Data Structures & Algorithms', description: 'Arrays, Linked Lists, Trees, Graphs, Sorting, Searching, DP. Practice on LeetCode.', resources: ['DSA with Java Course', 'LeetCode 150'], estimatedTime: '3-4 months', level: 'Intermediate' },
      { id: 's3', title: 'System Design', description: 'Learn scalability, databases, caching, load balancing, microservices architecture.', resources: ['System Design Primer', 'Interview Prep Bootcamp'], estimatedTime: '2 months', level: 'Advanced' },
      { id: 's4', title: 'Interview Preparation', description: 'Mock interviews, behavioral rounds, resume building, LinkedIn optimization.', resources: ['Interview Bootcamp', 'Resume Guide'], estimatedTime: '1-2 months', level: 'Advanced' },
    ],
  },
  {
    id: 'rm2', title: 'Crack JEE — Complete Roadmap', description: 'Strategic roadmap to crack JEE Mains and Advanced in your first attempt.',
    category: 'Competitive Exams', totalDuration: '2 years', status: 'Published', views: 32000,
    createdAt: '2025-11-01', thumbnail: '',
    steps: [
      { id: 's5', title: 'Class 11 Foundation', description: 'Build strong conceptual understanding of Physics, Chemistry, Maths. Focus on NCERT.', resources: ['JEE Complete Course', 'NCERT Books'], estimatedTime: '1 year', level: 'Foundation' },
      { id: 's6', title: 'Class 12 + Revision', description: 'Complete syllabus, start solving PYQs, take full mock tests regularly.', resources: ['PYQ Collection', 'Mock Tests'], estimatedTime: '8 months', level: 'Intermediate' },
      { id: 's7', title: 'Final Revision & Exam Strategy', description: 'Last 2 months revision, time management strategy, exam day tips.', resources: ['Revision Notes', 'Exam Tips Guide'], estimatedTime: '2 months', level: 'Advanced' },
    ],
  },
  {
    id: 'rm3', title: 'Become a Data Scientist', description: 'End-to-end roadmap from Python basics to landing a data science role.',
    category: 'Tech Career', totalDuration: '8-12 months', status: 'Published', views: 28000,
    createdAt: '2026-01-01', thumbnail: '',
    steps: [
      { id: 's8', title: 'Python & Statistics', description: 'Python programming, pandas, numpy, statistics, probability fundamentals.', resources: ['Python Course', 'Statistics for DS'], estimatedTime: '2-3 months', level: 'Foundation' },
      { id: 's9', title: 'Machine Learning', description: 'Supervised/unsupervised learning, model evaluation, feature engineering.', resources: ['AI & ML Course', 'Kaggle Learn'], estimatedTime: '3 months', level: 'Intermediate' },
      { id: 's10', title: 'Deep Learning & Projects', description: 'Neural networks, CNN, NLP, build 3-5 portfolio projects.', resources: ['Deep Learning Course', 'Project Ideas PDF'], estimatedTime: '3 months', level: 'Advanced' },
    ],
  },
]

// ─── Store ───────────────────────────────────────────────────────────────────
export const useContentStore = create<ContentState>()(
  persist(
    (set) => ({
      courses: seedCourses,
      resources: seedResources,
      quizzes: seedQuizzes,
      roadmaps: seedRoadmaps,

      addCourse: (course) => set((s) => ({
        courses: [...s.courses, { ...course, id: `c-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateCourse: (id, data) => set((s) => ({
        courses: s.courses.map((c) => c.id === id ? { ...c, ...data } : c)
      })),
      deleteCourse: (id) => set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),
      toggleCourseStatus: (id) => set((s) => ({
        courses: s.courses.map((c) => c.id === id ? { ...c, status: c.status === 'Published' ? 'Draft' : 'Published' } : c)
      })),

      addResource: (resource) => set((s) => ({
        resources: [...s.resources, { ...resource, id: `r-${Date.now()}`, downloads: 0, bookmarks: 0, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateResource: (id, data) => set((s) => ({
        resources: s.resources.map((r) => r.id === id ? { ...r, ...data } : r)
      })),
      deleteResource: (id) => set((s) => ({ resources: s.resources.filter((r) => r.id !== id) })),
      toggleResourceStatus: (id) => set((s) => ({
        resources: s.resources.map((r) => r.id === id ? { ...r, status: r.status === 'Published' ? 'Draft' : 'Published' } : r)
      })),

      addQuiz: (quiz) => set((s) => ({
        quizzes: [...s.quizzes, { ...quiz, id: `q-${Date.now()}`, participants: 0, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateQuiz: (id, data) => set((s) => ({
        quizzes: s.quizzes.map((q) => q.id === id ? { ...q, ...data } : q)
      })),
      deleteQuiz: (id) => set((s) => ({ quizzes: s.quizzes.filter((q) => q.id !== id) })),
      toggleQuizStatus: (id) => set((s) => ({
        quizzes: s.quizzes.map((q) => q.id === id ? { ...q, status: q.status === 'Published' ? 'Draft' : 'Published' } : q)
      })),

      addRoadmap: (roadmap) => set((s) => ({
        roadmaps: [...s.roadmaps, { ...roadmap, id: `rm-${Date.now()}`, views: 0, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateRoadmap: (id, data) => set((s) => ({
        roadmaps: s.roadmaps.map((r) => r.id === id ? { ...r, ...data } : r)
      })),
      deleteRoadmap: (id) => set((s) => ({ roadmaps: s.roadmaps.filter((r) => r.id !== id) })),
      toggleRoadmapStatus: (id) => set((s) => ({
        roadmaps: s.roadmaps.map((r) => r.id === id ? { ...r, status: r.status === 'Published' ? 'Draft' : 'Published' } : r)
      })),
    }),
    { name: 'skill021_content' }
  )
)
