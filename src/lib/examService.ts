import { supabase } from './supabase'
import type { ExamInput, ExamRow } from './pathfinderTypes'

export async function getExams(): Promise<ExamRow[]> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase error in getExams:', error)
    throw new Error(`Failed to fetch exams: ${error.message}`)
  }
  return (data ?? []).map((row: any) => ({
    ...row,
    id: String(row.id)
  })) as ExamRow[]
}

export async function getExam(id: string): Promise<ExamRow> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`Supabase error in getExam (${id}):`, error)
    throw new Error(`Failed to fetch exam: ${error.message}`)
  }
  return {
    ...data,
    id: String(data.id)
  } as ExamRow
}

export async function createExam(input: ExamInput): Promise<ExamRow> {
  const { data, error } = await supabase
    .from('exams')
    .insert(input)
    .select('*')
    .single()

  if (error) {
    console.error('Supabase error in createExam:', error)
    throw new Error(`Failed to create exam: ${error.message}`)
  }
  return {
    ...data,
    id: String(data.id)
  } as ExamRow
}

export async function updateExam(id: string, input: Partial<ExamInput>): Promise<ExamRow> {
  const { data, error } = await supabase
    .from('exams')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error(`Supabase error in updateExam (${id}):`, error)
    throw new Error(`Failed to update exam: ${error.message}`)
  }
  return {
    ...data,
    id: String(data.id)
  } as ExamRow
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(`Supabase error in deleteExam (${id}):`, error)
    throw new Error(`Failed to delete exam: ${error.message}`)
  }
}

