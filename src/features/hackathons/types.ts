export type HackathonStatus = 'upcoming' | 'ongoing' | 'completed'

export interface Hackathon {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  registrationDeadline: string
  venue: string
  bannerUrl: string
  minTeamSize: number
  maxTeamSize: number
  maxTeams: number
  currentTeams: number
  numberOfDays: number
  currentDay: number
  numberOfRounds: number
  currentRound: number
  isRegistrationOpen: boolean
  status: HackathonStatus
  rules: string
  createdAt: string
}

export interface TeamMember {
  name: string
  rollNumber: string
  college: string
  branch: string
  email?: string
  present?: boolean
}

export interface DayAttendanceRecord {
  marked: boolean
  markedAt?: string
  members: TeamMember[]
}

export interface HackathonTeam {
  id: string
  hackathonId: string
  teamCode: string
  teamName: string
  leaderName: string
  leaderEmail: string
  leaderCollege: string
  leaderBranch: string
  members: TeamMember[]
  position?: 1 | 2 | 3 | null
  qualifications: Record<string, boolean> // e.g. { "1": true, "2": false }
  dayAttendance: Record<string, DayAttendanceRecord> // e.g. { "1": { marked: true, members: [...] } }
  createdAt: string
}

export interface CreateHackathonInput {
  title: string
  description: string
  startDate: string
  endDate: string
  registrationDeadline: string
  venue: string
  bannerUrl?: string
  minTeamSize: number
  maxTeamSize: number
  maxTeams: number
  numberOfDays: number
  numberOfRounds: number
  isRegistrationOpen?: boolean
  status?: HackathonStatus
  rules?: string
}

export interface RegisterTeamInput {
  hackathonId: string
  teamName: string
  leaderName: string
  leaderEmail: string
  leaderCollege: string
  leaderBranch: string
  members: TeamMember[]
}
