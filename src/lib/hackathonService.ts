import { supabase } from './supabase'
import {
  Hackathon,
  HackathonTeam,
  CreateHackathonInput,
  RegisterTeamInput,
  TeamMember,
  HackathonStatus,
} from '../features/hackathons/types'

// Clear legacy mock localStorage if present
try {
  localStorage.removeItem('skills021_hackathons_db')
  localStorage.removeItem('skills021_hackathon_teams_db')
} catch {}

// DB Row mapping utilities
function mapHackathonFromDb(row: any): Hackathon {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    startDate: row.start_date,
    endDate: row.end_date,
    registrationDeadline: row.registration_deadline,
    venue: row.venue || '',
    bannerUrl: row.banner_url || '',
    minTeamSize: row.min_team_size ?? 1,
    maxTeamSize: row.max_team_size ?? 4,
    maxTeams: row.max_teams ?? 50,
    currentTeams: row.current_teams ?? 0,
    numberOfDays: row.number_of_days ?? 1,
    currentDay: row.current_day ?? 1,
    numberOfRounds: row.number_of_rounds ?? 1,
    currentRound: row.current_round ?? 1,
    isRegistrationOpen: row.is_registration_open ?? true,
    status: (row.status as HackathonStatus) || 'upcoming',
    rules: row.rules || '',
    createdAt: row.created_at,
  }
}

function mapHackathonToDb(h: Partial<Hackathon>) {
  const row: any = {}
  if (h.id && h.id.includes('-')) row.id = h.id
  if (h.title !== undefined) row.title = h.title
  if (h.description !== undefined) row.description = h.description
  if (h.startDate !== undefined) row.start_date = h.startDate
  if (h.endDate !== undefined) row.end_date = h.endDate
  if (h.registrationDeadline !== undefined) row.registration_deadline = h.registrationDeadline
  if (h.venue !== undefined) row.venue = h.venue
  if (h.bannerUrl !== undefined) row.banner_url = h.bannerUrl
  if (h.minTeamSize !== undefined) row.min_team_size = h.minTeamSize
  if (h.maxTeamSize !== undefined) row.max_team_size = h.maxTeamSize
  if (h.maxTeams !== undefined) row.max_teams = h.maxTeams
  if (h.currentTeams !== undefined) row.current_teams = h.currentTeams
  if (h.numberOfDays !== undefined) row.number_of_days = h.numberOfDays
  if (h.currentDay !== undefined) row.current_day = h.currentDay
  if (h.numberOfRounds !== undefined) row.number_of_rounds = h.numberOfRounds
  if (h.currentRound !== undefined) row.current_round = h.currentRound
  if (h.isRegistrationOpen !== undefined) row.is_registration_open = h.isRegistrationOpen
  if (h.status !== undefined) row.status = h.status
  if (h.rules !== undefined) row.rules = h.rules
  return row
}

function mapTeamFromDb(row: any): HackathonTeam {
  return {
    id: row.id,
    hackathonId: row.hackathon_id,
    teamCode: row.team_code,
    teamName: row.team_name,
    leaderName: row.leader_name,
    leaderEmail: row.leader_email,
    leaderCollege: row.leader_college || '',
    leaderBranch: row.leader_branch || '',
    members: row.members || [],
    position: row.position ?? null,
    qualifications: row.qualifications || {},
    dayAttendance: row.day_attendance || {},
    createdAt: row.created_at,
  }
}

// ─── Direct Supabase API Methods ───────────────────────────────────────────────

export async function fetchHackathons(): Promise<Hackathon[]> {
  try {
    const { data, error } = await supabase
      .from('hackathons')
      .select('id, title, description, start_date, end_date, registration_deadline, venue, banner_url, min_team_size, max_team_size, max_teams, current_teams, number_of_days, current_day, number_of_rounds, current_round, is_registration_open, status, rules, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase fetchHackathons error:', error.message)
      return []
    }

    return (data || []).map(mapHackathonFromDb)
  } catch (err) {
    console.warn('Supabase fetchHackathons error:', err)
    return []
  }
}

export async function fetchHackathonById(id: string): Promise<Hackathon | null> {
  try {
    const { data, error } = await supabase
      .from('hackathons')
      .select('id, title, description, start_date, end_date, registration_deadline, venue, banner_url, min_team_size, max_team_size, max_teams, current_teams, number_of_days, current_day, number_of_rounds, current_round, is_registration_open, status, rules, created_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.warn(`Supabase fetchHackathonById error for ${id}:`, error.message)
      return null
    }

    return data ? mapHackathonFromDb(data) : null
  } catch (err) {
    console.warn(`Supabase fetchHackathonById error for ${id}:`, err)
    return null
  }
}

export async function createHackathon(input: CreateHackathonInput): Promise<Hackathon> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined
  const payload: any = {
    title: input.title,
    description: input.description,
    start_date: input.startDate,
    end_date: input.endDate,
    registration_deadline: input.registrationDeadline,
    venue: input.venue,
    banner_url: input.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    min_team_size: input.minTeamSize,
    max_team_size: input.maxTeamSize,
    max_teams: input.maxTeams,
    current_teams: 0,
    number_of_days: input.numberOfDays,
    current_day: 1,
    number_of_rounds: input.numberOfRounds,
    current_round: 1,
    is_registration_open: input.isRegistrationOpen ?? true,
    status: input.status || 'upcoming',
    rules: input.rules || '',
  }

  if (newId) payload.id = newId

  const { data, error } = await supabase
    .from('hackathons')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Supabase createHackathon error:', error)
    throw new Error(error.message)
  }

  return mapHackathonFromDb(data)
}

export async function updateHackathon(id: string, updates: Partial<Hackathon>): Promise<Hackathon | null> {
  const dbUpdates = mapHackathonToDb(updates)
  const { data, error } = await supabase
    .from('hackathons')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error(`Supabase updateHackathon error for ${id}:`, error)
    throw new Error(error.message)
  }

  return data ? mapHackathonFromDb(data) : null
}

export async function deleteHackathon(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('hackathons')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(`Supabase deleteHackathon error for ${id}:`, error)
    throw new Error(error.message)
  }

  return true
}

export async function fetchTeams(hackathonId: string): Promise<HackathonTeam[]> {
  try {
    const { data, error } = await supabase
      .from('hackathon_teams')
      .select('id, hackathon_id, team_code, team_name, leader_name, leader_email, leader_college, leader_branch, members, position, qualifications, day_attendance, created_at')
      .eq('hackathon_id', hackathonId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn(`Supabase fetchTeams error for ${hackathonId}:`, error.message)
      return []
    }

    return (data || []).map(mapTeamFromDb)
  } catch (err) {
    console.warn(`Supabase fetchTeams error for ${hackathonId}:`, err)
    return []
  }
}

export async function registerTeam(input: RegisterTeamInput): Promise<HackathonTeam> {
  const hackathon = await fetchHackathonById(input.hackathonId)
  if (!hackathon) throw new Error('Hackathon not found.')

  if (!hackathon.isRegistrationOpen || hackathon.status === 'ongoing' || hackathon.status === 'completed') {
    throw new Error('Registration is currently closed for this hackathon.')
  }

  if (new Date() > new Date(hackathon.registrationDeadline)) {
    throw new Error('Registration deadline has passed.')
  }

  if (hackathon.currentTeams >= hackathon.maxTeams) {
    throw new Error('Hackathon capacity is full.')
  }

  // Duplicate email check
  const existingTeams = await fetchTeams(input.hackathonId)
  const normEmail = input.leaderEmail.trim().toLowerCase()
  const hasDuplicate = existingTeams.some(t => t.leaderEmail.trim().toLowerCase() === normEmail)
  if (hasDuplicate) {
    throw new Error('This leader email address is already registered for this hackathon.')
  }

  const nextTeamNum = existingTeams.length + 1
  const teamCode = `T${String(nextTeamNum).padStart(2, '0')}`
  const newTeamId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined

  const payload: any = {
    hackathon_id: input.hackathonId,
    team_code: teamCode,
    team_name: input.teamName,
    leader_name: input.leaderName,
    leader_email: input.leaderEmail,
    leader_college: input.leaderCollege,
    leader_branch: input.leaderBranch,
    members: input.members,
    position: null,
    qualifications: { '1': true }, // default qualified for Round 1
    day_attendance: {},
  }

  if (newTeamId) payload.id = newTeamId

  const { data, error } = await supabase
    .from('hackathon_teams')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Supabase registerTeam error:', error)
    throw new Error(error.message)
  }

  // Increment current_teams count in Supabase
  await updateHackathon(input.hackathonId, { currentTeams: hackathon.currentTeams + 1 })

  return mapTeamFromDb(data)
}

export async function updateTeamQualification(teamId: string, round: number, qualified: boolean): Promise<boolean> {
  const { data: teamRow, error: fetchErr } = await supabase
    .from('hackathon_teams')
    .select('qualifications')
    .eq('id', teamId)
    .single()

  if (fetchErr) throw new Error(fetchErr.message)

  const currentQuals = teamRow?.qualifications || {}
  const updatedQuals = { ...currentQuals, [String(round)]: qualified }

  const { error } = await supabase
    .from('hackathon_teams')
    .update({ qualifications: updatedQuals })
    .eq('id', teamId)

  if (error) {
    console.error(`Supabase updateTeamQualification error for ${teamId}:`, error)
    throw new Error(error.message)
  }

  return true
}

export async function updateTeamPosition(hackathonId: string, teamId: string, position: 1 | 2 | 3 | null): Promise<boolean> {
  if (position !== null) {
    const hackathonTeams = await fetchTeams(hackathonId)
    for (const t of hackathonTeams) {
      if (t.position === position && t.id !== teamId) {
        await supabase.from('hackathon_teams').update({ position: null }).eq('id', t.id)
      }
    }
  }

  const { error } = await supabase
    .from('hackathon_teams')
    .update({ position })
    .eq('id', teamId)

  if (error) {
    console.error(`Supabase updateTeamPosition error for ${teamId}:`, error)
    throw new Error(error.message)
  }

  return true
}

export async function markMemberAttendance(teamId: string, day: number, members: TeamMember[]): Promise<boolean> {
  const { data: teamRow, error: fetchErr } = await supabase
    .from('hackathon_teams')
    .select('day_attendance')
    .eq('id', teamId)
    .single()

  if (fetchErr) throw new Error(fetchErr.message)

  const currentAttendance = teamRow?.day_attendance || {}
  const updatedAttendance = {
    ...currentAttendance,
    [String(day)]: {
      marked: true,
      markedAt: new Date().toISOString(),
      members,
    },
  }

  const { error } = await supabase
    .from('hackathon_teams')
    .update({ day_attendance: updatedAttendance, members })
    .eq('id', teamId)

  if (error) {
    console.error(`Supabase markMemberAttendance error for ${teamId}:`, error)
    throw new Error(error.message)
  }

  return true
}

/**
 * Checks if a team is eligible/qualified to participate in a given round.
 * A team is qualified for `round` (e.g. Round 2) if and only if it was qualified
 * in all preceding rounds (1, 2, ..., round - 1).
 */
export function isTeamQualifiedForRound(team: HackathonTeam, round: number): boolean {
  if (round <= 1) return true
  for (let r = 1; r < round; r++) {
    if (team.qualifications[String(r)] !== true) {
      return false
    }
  }
  return true
}

/**
 * Returns the round number in which the team was eliminated, or null if not eliminated up to maxRound.
 */
export function getTeamEliminatedRound(team: HackathonTeam, maxRound: number): number | null {
  for (let r = 1; r <= maxRound; r++) {
    if (team.qualifications[String(r)] === false) {
      return r
    }
    if (r > 1 && team.qualifications[String(r - 1)] !== true) {
      return r - 1
    }
  }
  return null
}

