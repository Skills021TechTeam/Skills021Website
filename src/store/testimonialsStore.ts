import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TestimonialType = 'General' | 'Placement' | 'Admission' | 'Internship' | 'Counseling'

export interface Testimonial {
  id: string
  studentName: string
  designation: string
  company?: string
  college?: string
  photo?: string
  content: string
  rating: number
  type: TestimonialType
  achievement?: string
  course?: string
  status: 'Published' | 'Draft'
  featured: boolean
  createdAt: string
}

export interface SuccessStory {
  id: string
  studentName: string
  fromCollege: string
  toCompany?: string
  toCollege?: string
  package?: string
  photo?: string
  story: string
  type: 'Placement' | 'Admission' | 'Internship'
  course?: string
  year: string
  status: 'Published' | 'Draft'
  featured: boolean
  createdAt: string
}

interface TestimonialsState {
  testimonials: Testimonial[]
  stories: SuccessStory[]
  addTestimonial: (t: Omit<Testimonial, 'id' | 'createdAt'>) => void
  updateTestimonial: (id: string, data: Partial<Testimonial>) => void
  deleteTestimonial: (id: string) => void
  toggleTestimonialStatus: (id: string) => void
  addStory: (s: Omit<SuccessStory, 'id' | 'createdAt'>) => void
  updateStory: (id: string, data: Partial<SuccessStory>) => void
  deleteStory: (id: string) => void
  toggleStoryStatus: (id: string) => void
}

const seedTestimonials: Testimonial[] = [
  {
    id: 't1', studentName: 'Rahul Sharma', designation: 'SDE at Infosys', company: 'Infosys', college: 'AKTU',
    content: 'Skills021 changed my life! The DSA course and mock interviews helped me crack my dream company. The mentors were incredibly supportive throughout my journey.',
    rating: 5, type: 'Placement', achievement: 'Got placed at Infosys with ₹7 LPA package', course: 'DSA with Java',
    status: 'Published', featured: true, createdAt: '2026-04-10',
  },
  {
    id: 't2', studentName: 'Priya Verma', designation: 'IIT Delhi Student', college: 'IIT Delhi',
    content: 'The JEE preparation course on Skills021 is absolutely outstanding. Detailed video lectures, PYQs, and mock tests helped me score AIR 1240 in JEE Advanced!',
    rating: 5, type: 'Admission', achievement: 'AIR 1240 in JEE Advanced', course: 'JEE Complete Course',
    status: 'Published', featured: true, createdAt: '2026-03-15',
  },
  {
    id: 't3', studentName: 'Amit Singh', designation: 'Data Scientist Intern', company: 'Amazon', college: 'DTU',
    content: 'Got my dream internship at Amazon through Skills021\'s internship portal and ML course. The resume review session was a game changer!',
    rating: 5, type: 'Internship', achievement: 'Amazon Data Science Internship', course: 'AI & ML Course',
    status: 'Published', featured: true, createdAt: '2026-05-01',
  },
  {
    id: 't4', studentName: 'Neha Gupta', designation: 'B.Tech Student', college: 'NSIT Delhi',
    content: 'The JoSAA counseling session helped me get into NSIT Delhi for CSE branch. The counselor explained the entire process so clearly!',
    rating: 5, type: 'Counseling', achievement: 'Admitted to NSIT Delhi CSE',
    status: 'Published', featured: false, createdAt: '2026-02-20',
  },
  {
    id: 't5', studentName: 'Karan Mehta', designation: 'Flutter Developer', company: 'StartupXYZ', college: 'IPU',
    content: 'The Flutter development course was excellent. I built 5 apps during the course and got a job even before graduation!',
    rating: 5, type: 'Placement', achievement: 'Flutter Developer at StartupXYZ', course: 'Flutter Development',
    status: 'Published', featured: true, createdAt: '2026-04-25',
  },
]

const seedStories: SuccessStory[] = [
  {
    id: 'ss1', studentName: 'Vikram Tiwari', fromCollege: 'Average Private College', toCompany: 'Microsoft',
    package: '₹42 LPA', story: 'Coming from a tier-3 college, everyone told me FAANG was impossible. But with Skills021\'s DSA course and 6 months of dedicated practice, I cracked Microsoft\'s interview in my first attempt. The mock interview sessions were the real game-changer.',
    type: 'Placement', course: 'DSA + Interview Prep Bootcamp', year: '2025', status: 'Published', featured: true, createdAt: '2025-12-01',
  },
  {
    id: 'ss2', studentName: 'Anjali Rai', fromCollege: 'Class 12 (PCM)', toCollege: 'IIT Bombay (CSE)',
    story: 'With AIR 890 in JEE Advanced, I\'m now at IIT Bombay! The JEE course on Skills021 had the most comprehensive content I\'ve seen. The daily tests and live doubt sessions made all the difference.',
    type: 'Admission', course: 'JEE Mains & Advanced Complete', year: '2025', status: 'Published', featured: true, createdAt: '2025-11-15',
  },
  {
    id: 'ss3', studentName: 'Rohan Das', fromCollege: 'NIT Allahabad', toCompany: 'Google',
    package: '₹65 LPA', story: 'Google was always my dream and Skills021 helped me achieve it. The system design and DSA content is world-class. I cleared all 5 rounds with confidence!',
    type: 'Placement', course: 'Interview Preparation Bootcamp', year: '2026', status: 'Published', featured: true, createdAt: '2026-01-10',
  },
]

export const useTestimonialsStore = create<TestimonialsState>()(
  persist(
    (set) => ({
      testimonials: seedTestimonials,
      stories: seedStories,
      addTestimonial: (t) => set((s) => ({
        testimonials: [...s.testimonials, { ...t, id: `t-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateTestimonial: (id, data) => set((s) => ({
        testimonials: s.testimonials.map((t) => t.id === id ? { ...t, ...data } : t)
      })),
      deleteTestimonial: (id) => set((s) => ({ testimonials: s.testimonials.filter((t) => t.id !== id) })),
      toggleTestimonialStatus: (id) => set((s) => ({
        testimonials: s.testimonials.map((t) => t.id === id ? { ...t, status: t.status === 'Published' ? 'Draft' : 'Published' } : t)
      })),
      addStory: (story) => set((s) => ({
        stories: [...s.stories, { ...story, id: `ss-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateStory: (id, data) => set((s) => ({
        stories: s.stories.map((story) => story.id === id ? { ...story, ...data } : story)
      })),
      deleteStory: (id) => set((s) => ({ stories: s.stories.filter((story) => story.id !== id) })),
      toggleStoryStatus: (id) => set((s) => ({
        stories: s.stories.map((story) => story.id === id ? { ...story, status: story.status === 'Published' ? 'Draft' : 'Published' } : story)
      })),
    }),
    { name: 'skill021_testimonials' }
  )
)
