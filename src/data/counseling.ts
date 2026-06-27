export interface CounselingProgram {
  id: string
  university: string
  shortName: string
  description: string
  features: string[]
  highlights: string[]
  color: string
  bgColor: string
  icon: string
  formUrl: string
}

export const counselingPrograms: CounselingProgram[] = [
  {
    id: 'aktu',
    university: 'AKTU Counseling',
    shortName: 'AKTU',
    description: 'Expert guidance for B.Tech, MBA, and MCA admissions under Dr. APJ Abdul Kalam Technical University, Lucknow — one of India\'s largest technical universities.',
    features: [
      'Round-wise seat matrix analysis for all AKTU-affiliated colleges',
      'Choice filling strategy and college preference optimization',
      'Document verification checklist and support',
      'Previous year cutoff trends and rank analysis',
      'Fee structure guidance and scholarship information',
      'One-on-one counseling sessions with experts',
    ],
    highlights: ['500+ affiliated colleges', 'B.Tech / MBA / MCA', 'Lucknow & UP-based'],
    color: '#6C63FF',
    bgColor: '#EEF0FF',
    icon: 'GraduationCap',
    formUrl: 'https://forms.gle/BpcgGfoKjG1SVgFPA',
  },
  {
    id: 'ipu',
    university: 'IPU Counseling',
    shortName: 'IPU',
    description: 'Complete admission guidance for Guru Gobind Singh Indraprastha University, Delhi — covering B.Tech, BCA, MBA, and MCA programs through IPU CET.',
    features: [
      'IPU CET cutoff analysis and rank prediction',
      'College preference strategy for all IPU-affiliated institutes',
      'Fee structure and hostel availability guidance',
      'B.Tech, BCA, BBA, MBA, MCA program counseling',
      'GGSIPU affiliated top college recommendations',
      'Mock counseling rounds and seat allotment simulation',
    ],
    highlights: ['CET-based admission', 'Delhi NCR colleges', 'B.Tech / BCA / MBA / MCA'],
    color: '#10B981',
    bgColor: '#ECFDF5',
    icon: 'BookOpen',
    formUrl: 'https://forms.gle/BpcgGfoKjG1SVgFPA',
  },
  {
    id: 'josaa',
    university: 'JoSAA Counseling',
    shortName: 'JoSAA',
    description: 'Specialized guidance for Joint Seat Allocation Authority — the gateway to IITs, NITs, IIITs, and GFTIs through JEE Main and JEE Advanced scores.',
    features: [
      'Mock seat allocation based on your JEE rank',
      'Branch prediction for IITs, NITs, and IIITs',
      'Round-wise withdrawal and floating strategy',
      'Home state quota and category seat analysis',
      'Choice filling optimization with 200+ option guidance',
      'Real-time support during all counseling rounds',
    ],
    highlights: ['IITs / NITs / IIITs / GFTIs', 'JEE Main & Advanced', '6 counseling rounds'],
    color: '#F59E0B',
    bgColor: '#FFF8E7',
    icon: 'Award',
    formUrl: 'https://forms.gle/BpcgGfoKjG1SVgFPA',
  },
  {
    id: 'jac',
    university: 'JAC Delhi Counseling',
    shortName: 'JAC Delhi',
    description: 'Expert guidance for Joint Admission Counseling Delhi — covering premium institutions like DTU, NSIT, IGDTUW, and IIIT Delhi based on JEE Main scores.',
    features: [
      'DTU, NSIT, IGDTUW, IIIT Delhi cutoff trend analysis',
      'Rank vs. branch analysis for all JAC Delhi colleges',
      'Special round and spot round strategy',
      'Home state domicile and category benefits guidance',
      'Complete seat matrix with expected opening/closing ranks',
      'Priority list optimization for maximum chances',
    ],
    highlights: ['DTU / NSIT / IGDTUW / IIIT Delhi', 'JEE Main scores', 'Delhi domicile benefits'],
    color: '#EF4444',
    bgColor: '#FEF2F2',
    icon: 'MapPin',
    formUrl: 'https://forms.gle/BpcgGfoKjG1SVgFPA',
  },
]

export const counselingFAQs = [
  {
    id: 'faq-1',
    question: 'What documents do I need for AKTU counseling?',
    answer: 'For AKTU counseling, you\'ll need: 10th and 12th mark sheets, JEE Main scorecard, UPCET rank card (if applicable), identity proof (Aadhar/PAN), passport-size photographs, category certificate (if applicable), domicile certificate for UP residents, and counseling fee payment receipt.',
  },
  {
    id: 'faq-2',
    question: 'What is the difference between JoSAA and CSAB?',
    answer: 'JoSAA (Joint Seat Allocation Authority) handles seat allotment for IITs, NITs, IIITs, and GFTIs in the first phase. CSAB (Central Seat Allocation Board) conducts special rounds after JoSAA for vacant seats in NITs, IIITs, and GFTIs. If you don\'t get a seat in JoSAA, you can participate in CSAB rounds.',
  },
  {
    id: 'faq-3',
    question: 'How many choices should I fill in IPU CET counseling?',
    answer: 'You should fill as many choices as possible in IPU CET counseling — ideally 40-60 choices covering your preferred programs and colleges. Start with your dream college+branch, then add safety options. Include both CSE and CSE-related branches. Our counselors help you build an optimal preference list based on your rank.',
  },
  {
    id: 'faq-4',
    question: 'Can I upgrade my seat after initial allotment in JAC Delhi?',
    answer: 'Yes! JAC Delhi conducts multiple rounds. If you get a seat in round 1, you can choose to freeze it (accept and stop) or float it (accept but participate in subsequent rounds for a better option). You can also slide (accept a higher-priority option within the same college). Our team guides you on the optimal strategy.',
  },
  {
    id: 'faq-5',
    question: 'What is the fee for Skills021 counseling guidance?',
    answer: 'Skills021 offers free initial counseling sessions for all university programs. For personalized 1-on-1 sessions, mock counseling simulations, and detailed rank analysis, nominal charges apply. Fill the Google Form to get a callback from our counseling experts who will explain all options.',
  },
  {
    id: 'faq-6',
    question: 'Is online counseling available or only offline?',
    answer: 'We offer both online and offline counseling modes. Online sessions are conducted via Google Meet or Zoom, making it convenient for students across India. Offline sessions are available in Delhi and Lucknow. All resources (cutoff sheets, seat matrices, choice filling guides) are shared digitally regardless of mode.',
  },
]
