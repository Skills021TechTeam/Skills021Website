import { supabase } from './supabase'
import type { CareerMappingInput, CareerMappingRow } from './pathfinderTypes'

const MAPPING_SELECT = `
  id, career_path_id, exam_id, priority,
  career_paths ( id, title ),
  exams ( id, title )
`

interface DBMappingRow {
  id: string
  career_path_id: string
  exam_id: string
  priority: number
  career_paths: any
  exams: any
}

function parseJoinedObject(val: any): { id: string; title: string } | null {
  if (!val) return null
  const item = Array.isArray(val) ? (val[0] || null) : val
  if (!item || !item.id) return null
  return {
    id: String(item.id),
    title: item.title || ''
  }
}

export async function getCareerMappings(): Promise<CareerMappingRow[]> {
  const { data, error } = await supabase
    .from('career_path_exams')
    .select(MAPPING_SELECT)
    .order('id', { ascending: false })

  if (error) {
    console.error('Supabase error in getCareerMappings:', error)
    throw new Error(`Failed to fetch career mappings: ${error.message}`)
  }

  const grouped = new Map<string, CareerMappingRow>()
  const rows = (data ?? []) as unknown as DBMappingRow[]

  rows.forEach((row) => {
    const careerIdStr = String(row.career_path_id)
    const existing = grouped.get(careerIdStr)
    const careerPathObj = parseJoinedObject(row.career_paths)
    const examObj = parseJoinedObject(row.exams)

    if (existing) {
      existing.exam_ids.push(String(row.exam_id))
      existing.relation_ids?.push(String(row.id))
      if (examObj) {
        existing.exams = [
          ...(existing.exams ?? []),
          examObj
        ]
      }
      return
    }

    grouped.set(careerIdStr, {
      id: careerIdStr,
      career_path_id: careerIdStr,
      exam_ids: row.exam_id ? [String(row.exam_id)] : [],
      relation_ids: row.id ? [String(row.id)] : [],
      career_paths: careerPathObj || undefined,
      exams: examObj ? [examObj] : [],
    })
  })

  return Array.from(grouped.values())
}

export async function getMappingsForCareer(careerId: string): Promise<CareerMappingRow | null> {
  const { data, error } = await supabase
    .from('career_path_exams')
    .select(MAPPING_SELECT)
    .eq('career_path_id', careerId)

  if (error) {
    console.error(`Supabase error in getMappingsForCareer (${careerId}):`, error)
    throw new Error(`Failed to fetch mapping for career: ${error.message}`)
  }

  const rows = (data ?? []) as unknown as DBMappingRow[]
  if (rows.length === 0) return null

  const first = rows[0]
  const careerIdStr = String(first.career_path_id)
  const careerPathObj = parseJoinedObject(first.career_paths)

  const mapping: CareerMappingRow = {
    id: careerIdStr,
    career_path_id: careerIdStr,
    exam_ids: [],
    relation_ids: [],
    career_paths: careerPathObj || undefined,
    exams: [],
  }

  rows.forEach((row) => {
    if (row.exam_id) {
      mapping.exam_ids.push(String(row.exam_id))
      mapping.relation_ids?.push(String(row.id))
      const examObj = parseJoinedObject(row.exams)
      if (examObj) {
        mapping.exams = [
          ...(mapping.exams ?? []),
          examObj
        ]
      }
    }
  })

  return mapping
}

export async function getMappingById(id: string): Promise<CareerMappingRow | null> {
  return getMappingsForCareer(id)
}

export async function createCareerMapping(input: CareerMappingInput): Promise<CareerMappingRow> {
  const rows = input.exam_ids.map((examId, index) => ({
    career_path_id: input.career_path_id,
    exam_id: examId,
    priority: index + 1,
  }))

  const { error } = await supabase
    .from('career_path_exams')
    .insert(rows)

  if (error) {
    console.error('Supabase error in createCareerMapping:', error)
    throw new Error(`Failed to create career mapping: ${error.message}`)
  }
  const mappings = await getCareerMappings()
  const created = mappings.find((mapping) => mapping.career_path_id === input.career_path_id)
  if (!created) throw new Error('Career mapping was saved but could not be reloaded')
  return created
}

export async function updateCareerMapping(id: string, input: Partial<CareerMappingInput>): Promise<CareerMappingRow> {
  const careerPathId = input.career_path_id ?? id

  const { error: deleteError } = await supabase
    .from('career_path_exams')
    .delete()
    .eq('career_path_id', careerPathId)

  if (deleteError) {
    console.error(`Supabase error in updateCareerMapping delete phase (${careerPathId}):`, deleteError)
    throw new Error(`Failed to update career mapping: ${deleteError.message}`)
  }

  if (!input.exam_ids || input.exam_ids.length === 0) {
    return {
      id: careerPathId,
      career_path_id: careerPathId,
      exam_ids: [],
    }
  }

  return createCareerMapping({ career_path_id: careerPathId, exam_ids: input.exam_ids })
}

export async function deleteCareerMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('career_path_exams')
    .delete()
    .eq('career_path_id', id)

  if (error) {
    console.error(`Supabase error in deleteCareerMapping (${id}):`, error)
    throw new Error(`Failed to delete career mapping: ${error.message}`)
  }
}
