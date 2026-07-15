import { supabase } from './supabase'
import type { CareerPathInput, CareerPathRow } from './pathfinderTypes'

function parseTextToList(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed.map(item => String(item))
      } catch (e) {
        // Fallback to splitting by comma if JSON parse fails
      }
    }
    return trimmed.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

function stringifyList(value: any): string | null {
  if (!value) return null
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }
  if (typeof value === 'string') {
    return value
  }
  return null
}

export async function getCareerPaths(): Promise<CareerPathRow[]> {
  const { data, error } = await supabase
    .from('career_paths')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase error in getCareerPaths:', error)
    throw new Error(`Failed to fetch career paths: ${error.message}`)
  }
  return (data ?? []).map((row: any) => ({
    ...row,
    id: String(row.id),
    required_skills: parseTextToList(row.required_skills),
    industries: parseTextToList(row.industries)
  })) as CareerPathRow[]
}

export async function getCareerPath(id: string): Promise<CareerPathRow> {
  const { data, error } = await supabase
    .from('career_paths')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`Supabase error in getCareerPath (${id}):`, error)
    throw new Error(`Failed to fetch career path: ${error.message}`)
  }
  return {
    ...data,
    id: String(data.id),
    required_skills: parseTextToList(data.required_skills),
    industries: parseTextToList(data.industries)
  } as CareerPathRow
}

export async function createCareerPath(input: CareerPathInput): Promise<CareerPathRow> {
  const dbInput = {
    ...input,
    required_skills: stringifyList(input.required_skills),
    industries: stringifyList(input.industries)
  }
  const { data, error } = await supabase
    .from('career_paths')
    .insert(dbInput)
    .select('*')
    .single()

  if (error) {
    console.error('Supabase error in createCareerPath:', error)
    throw new Error(`Failed to create career path: ${error.message}`)
  }
  return {
    ...data,
    id: String(data.id),
    required_skills: parseTextToList(data.required_skills),
    industries: parseTextToList(data.industries)
  } as CareerPathRow
}

export async function updateCareerPath(id: string, input: Partial<CareerPathInput>): Promise<CareerPathRow> {
  const dbInput = {
    ...input,
    required_skills: 'required_skills' in input ? stringifyList(input.required_skills) : undefined,
    industries: 'industries' in input ? stringifyList(input.industries) : undefined
  }
  const { data, error } = await supabase
    .from('career_paths')
    .update(dbInput)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error(`Supabase error in updateCareerPath (${id}):`, error)
    throw new Error(`Failed to update career path: ${error.message}`)
  }
  return {
    ...data,
    id: String(data.id),
    required_skills: parseTextToList(data.required_skills),
    industries: parseTextToList(data.industries)
  } as CareerPathRow
}

export async function deleteCareerPath(id: string): Promise<void> {
  const { error } = await supabase
    .from('career_paths')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(`Supabase error in deleteCareerPath (${id}):`, error)
    throw new Error(`Failed to delete career path: ${error.message}`)
  }
}
