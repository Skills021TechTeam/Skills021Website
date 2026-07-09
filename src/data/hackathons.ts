export interface Hackathon {
  id: string
  name: string
  organizer: string
  startDate: string
  endDate: string
  status: 'Upcoming' | 'Ongoing' | 'Completed'
  mode: 'Online' | 'Offline' | 'Hybrid'
  prizePool: string
  teamSize: string
  tags: string[]
  registrationUrl: string
  description: string
  location?: string
}

export const hackathons: Hackathon[] = [
  {
    id: 'hack-1',
    name: 'XEN-O-THON 2026',
    organizer: 'AKTU — Dr. APJ Abdul Kalam Technical University',
    startDate: '2026-06-15',
    endDate: '2026-06-17',
    status: 'Ongoing',
    mode: 'Offline',
    prizePool: '₹50,000',
    teamSize: '2-4 members',
    tags: ['AI/ML', 'Innovation', 'Tech', 'Engineering'],
    registrationUrl: 'https://aktu.ac.in',
    description: 'XEN-O-THON is AKTU\'s flagship annual hackathon bringing together the brightest engineering minds to solve real-world problems using AI and emerging technologies.',
    location: 'Lucknow, UP',
  },
  {
    id: 'hack-2',
    name: 'SRM Builds 7.0',
    organizer: 'SRM Institute of Science and Technology',
    startDate: '2026-07-10',
    endDate: '2026-07-12',
    status: 'Upcoming',
    mode: 'Hybrid',
    prizePool: '₹1,00,000',
    teamSize: '2-5 members',
    tags: ['WebDev', 'Mobile', 'AI', 'Blockchain'],
    registrationUrl: 'https://srmist.edu.in',
    description: 'SRM Builds is one of India\'s largest student hackathons with tracks in Web Development, Mobile App Development, AI/ML, and Blockchain. Great networking opportunity!',
    location: 'Chennai + Online',
  },
  {
    id: 'hack-3',
    name: 'Smart India Hackathon 2025',
    organizer: 'AICTE — Ministry of Education',
    startDate: '2025-12-10',
    endDate: '2025-12-12',
    status: 'Completed',
    mode: 'Online',
    prizePool: '₹1,00,000',
    teamSize: '6 members',
    tags: ['GovTech', 'Innovation', 'Social Impact', 'Smart City'],
    registrationUrl: 'https://www.sih.gov.in',
    description: 'SIH is a nationwide hackathon initiative to provide students a platform to solve real-world problems faced by industries and government organizations.',
  },
  {
    id: 'hack-4',
    name: 'HackWithInfy 2026',
    organizer: 'Infosys',
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    status: 'Upcoming',
    mode: 'Online',
    prizePool: '₹75,000',
    teamSize: '2-3 members',
    tags: ['Cloud', 'AI', 'Enterprise', 'Open Innovation'],
    registrationUrl: 'https://infosys.com/hackwithinfy',
    description: 'Infosys HackWithInfy is a national coding competition for engineering students. Winners get cash prizes, pre-placement interviews, and internship opportunities.',
  },
  {
    id: 'hack-5',
    name: 'Code for Good 2026',
    organizer: 'JPMorgan Chase & Co.',
    startDate: '2026-07-25',
    endDate: '2026-07-27',
    status: 'Upcoming',
    mode: 'Hybrid',
    prizePool: 'Goodies + PPO',
    teamSize: '3-4 members',
    tags: ['FinTech', 'Social Good', 'NGO', 'Impact'],
    registrationUrl: 'https://jpmorgan.com/code-for-good',
    description: 'JPMorgan Code for Good connects talented students with non-profit organizations to solve real social challenges using technology. Top performers get Pre-Placement Offers!',
    location: 'Mumbai + Online',
  },
  {
    id: 'hack-6',
    name: 'Delhi Hacks 2026',
    organizer: 'Skills021 Partner',
    startDate: '2026-09-05',
    endDate: '2026-09-06',
    status: 'Upcoming',
    mode: 'Offline',
    prizePool: '₹25,000',
    teamSize: '2-4 members',
    tags: ['WebDev', 'Open Source', 'Student', 'Delhi NCR'],
    registrationUrl: 'https://forms.gle/BpcgGfoKjG1SVgFPA',
    description: 'Delhi Hacks is a 24-hour student hackathon organized in partnership with Skills021. Open to all Delhi NCR college students with tracks in web development and open source.',
    location: 'New Delhi',
  },
]
