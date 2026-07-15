import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SearchX, RotateCw, Compass } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import CareerCard from '../features/pathfinder/components/CareerCard'
import CareerDetails from '../features/pathfinder/components/CareerDetails'
import EmptyState from '../features/pathfinder/components/EmptyState'
import ExamCard from '../features/pathfinder/components/ExamCard'
import FilterSidebar from '../features/pathfinder/components/FilterSidebar'
import { CardSkeletonGrid, FilterSkeleton, HeroSkeleton } from '../features/pathfinder/components/LoadingSkeleton'
import PathFinderHero from '../features/pathfinder/components/PathFinderHero'
import RecommendedSection from '../features/pathfinder/components/RecommendedSection'
import PageShell from '../components/PageShell'

import { getCareerPaths } from '../lib/careerService'
import { getExams } from '../lib/examService'
import { getCareerMappings } from '../lib/mappingService'
import type { CareerPath, Exam as DBExam, CareerMappingRow } from '../lib/pathfinderTypes'
import type { Career, Exam as FrontendExam, ExamType, RegistrationStatus, SortOption } from '../features/pathfinder/types'

const mobileExamTypes: ExamType[] = ['Government', 'Private', 'National', 'State']
const mobileStatuses: RegistrationStatus[] = ['Open', 'Closing Soon', 'Upcoming']
const mobileSortOptions: SortOption[] = ['Nearest Registration Deadline', 'Upcoming Exam Date', 'Highest Salary', 'Alphabetical']

const ACCENTS = [
  'from-sky-500 to-blue-600',
  'from-indigo-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-cyan-500',
  'from-fuchsia-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-red-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-orange-500 to-red-600',
  'from-slate-600 to-zinc-800',
  'from-violet-500 to-indigo-600',
  'from-teal-500 to-emerald-600',
  'from-pink-500 to-rose-600',
]

function getIconComponent(iconName: string | null | undefined): LucideIcons.LucideIcon {
  if (!iconName) return LucideIcons.Compass
  const icon = (LucideIcons as any)[iconName]
  return icon || LucideIcons.Compass
}

function getRelatedCareerIds(careerId: string, allMappings: CareerMappingRow[]): string[] {
  const currentMapping = allMappings.find((m) => m.career_path_id === careerId)
  if (!currentMapping || !currentMapping.exam_ids || currentMapping.exam_ids.length === 0) {
    return []
  }
  const examSet = new Set(currentMapping.exam_ids)
  const related = new Set<string>()
  allMappings.forEach((m) => {
    if (m.career_path_id !== careerId) {
      const sharesExam = m.exam_ids.some((id) => examSet.has(id))
      if (sharesExam) {
        related.add(m.career_path_id)
      }
    }
  })
  return Array.from(related)
}

function getFinalRelatedCareerIds(careerId: string, allCareers: CareerPath[], allMappings: CareerMappingRow[]): string[] {
  const related = getRelatedCareerIds(careerId, allMappings)
  if (related.length >= 3) return related.slice(0, 3)

  const filled = [...related]
  for (const c of allCareers) {
    if (c.id !== careerId && !filled.includes(c.id)) {
      filled.push(c.id)
      if (filled.length >= 3) break
    }
  }
  return filled
}

function mapCareer(row: CareerPath, index: number, relatedIds: string[]): Career {
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    description: row.full_description || row.short_description,
    averageSalary: row.average_salary || 'TBD',
    careerGrowth: row.career_growth || 'TBD',
    requiredSkills: row.required_skills || [],
    educationRequired: row.education_required || 'TBD',
    eligibilityOverview: row.education_required || 'TBD',
    industriesHiring: row.industries || [],
    futureScope: row.future_scope || 'TBD',
    icon: getIconComponent(row.icon),
    accent: ACCENTS[index % ACCENTS.length],
    relatedCareerIds: relatedIds,
  }
}

function mapExam(row: DBExam): FrontendExam {
  const fee = row.application_fee
  const feeString = fee === null || fee === 0 ? 'No application fee' : `₹${fee}`

  return {
    id: row.id,
    name: row.title,
    conductingOrganization: row.conducting_body,
    registrationStartDate: row.registration_start || '',
    registrationEndDate: row.registration_end || '',
    examDate: row.exam_date || '',
    resultDate: row.result_date || '',
    eligibilitySummary: row.eligibility || 'TBD',
    applicationFee: feeString,
    selectionProcess: row.selection_process || 'TBD',
    status: row.status,
    type: row.exam_type,
    officialWebsite: row.official_website || '',
  }
}

export default function PathFinder() {
  const [search, setSearch] = useState('')
  const [careerPaths, setCareerPaths] = useState<Career[]>([])
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mappings, setMappings] = useState<CareerMappingRow[]>([])
  const [allExams, setAllExams] = useState<FrontendExam[]>([])

  const [showOnlyEligible, setShowOnlyEligible] = useState(true)
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [statuses, setStatuses] = useState<RegistrationStatus[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('Nearest Registration Deadline')

  const careersRef = useRef<HTMLDivElement>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [careersData, examsData, mappingsData] = await Promise.all([
        getCareerPaths(),
        getExams(),
        getCareerMappings(),
      ])

      const mappedCareers = careersData.map((row, idx) => {
        const relatedIds = getFinalRelatedCareerIds(row.id, careersData, mappingsData)
        return mapCareer(row, idx, relatedIds)
      })

      const mappedExams = examsData.map(mapExam)

      setCareerPaths(mappedCareers)
      setAllExams(mappedExams)
      setMappings(mappingsData)

      if (mappedCareers.length > 0) {
        setSelectedCareer((current) => {
          if (current) {
            const updated = mappedCareers.find((c) => c.id === current.id)
            return updated || null
          }
          return null
        })
      } else {
        setSelectedCareer(null)
      }
    } catch (err) {
      console.error('Supabase fetch error details in PathFinder page:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while loading data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredCareers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return careerPaths
    return careerPaths.filter((career) =>
      career.title.toLowerCase().includes(term) ||
      career.shortDescription.toLowerCase().includes(term) ||
      career.requiredSkills.some((skill) => skill.toLowerCase().includes(term))
    )
  }, [search, careerPaths])

  const getCareerExams = useCallback((careerId: string) => {
    const mapping = mappings.find((m) => m.career_path_id === careerId)
    if (!mapping || !mapping.exam_ids) return []
    return mapping.exam_ids
      .map((examId) => {
        const exam = allExams.find((e) => e.id === examId)
        return {
          exam,
          isEligible: true,
        }
      })
      .filter((item): item is { exam: FrontendExam; isEligible: boolean } => Boolean(item.exam))
  }, [mappings, allExams])

  const selectedExamRows = useMemo(() => {
    if (!selectedCareer) return []

    const salaryNumber = Number(selectedCareer.averageSalary.match(/\d+/)?.[0] ?? 0)
    return getCareerExams(selectedCareer.id)
      .filter(({ exam, isEligible }) => {
        if (showOnlyEligible && !isEligible) return false
        if (examTypes.length > 0 && !examTypes.includes(exam.type)) return false
        if (statuses.length > 0 && !statuses.includes(exam.status)) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'Alphabetical') return a.exam.name.localeCompare(b.exam.name)
        if (sortBy === 'Upcoming Exam Date') return new Date(a.exam.examDate).getTime() - new Date(b.exam.examDate).getTime()
        if (sortBy === 'Highest Salary') return salaryNumber === 0 ? 0 : -salaryNumber
        return new Date(a.exam.registrationEndDate).getTime() - new Date(b.exam.registrationEndDate).getTime()
      })
  }, [examTypes, selectedCareer, showOnlyEligible, sortBy, statuses, getCareerExams])

  const getRelatedCareers = useCallback((career: Career) => {
    return career.relatedCareerIds
      .map((id) => careerPaths.find((item) => item.id === id))
      .filter((item): item is Career => Boolean(item))
  }, [careerPaths])

  const handleSelectCareer = (career: Career) => {
    setSelectedCareer(career)
    setShowOnlyEligible(true)
    setExamTypes([])
    setStatuses([])
    window.setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const handleExploreCareers = () => {
    careersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (isLoading) {
    return (
      <PageShell eyebrow="PathFinder" title="Choose a career path with clarity" description="Explore careers, matching exams, and roadmap guidance tailored to your goals." compact>
        <HeroSkeleton />
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
          <aside className="hidden w-64 flex-shrink-0 lg:block"><FilterSkeleton /></aside>
          <main className="flex-1"><CardSkeletonGrid /></main>
        </div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell eyebrow="PathFinder" title="Choose a career path with clarity" description="Explore careers, matching exams, and roadmap guidance tailored to your goals." compact>
        <PathFinderHero search={search} onSearchChange={setSearch} onExploreClick={handleExploreCareers} />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="card p-8 border border-red-100 dark:border-red-950/20 bg-red-50/50 dark:bg-red-950/10 rounded-2xl">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Failed to load Pathfinder data</h3>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-6 leading-relaxed">
              We encountered a permission or configuration issue while retrieving the career paths.
              Please check the browser console logs for the full Supabase query error details.
            </p>
            <button
              onClick={loadData}
              className="btn-primary mx-auto flex items-center gap-2"
            >
              <RotateCw size={14} className="animate-none" /> Retry Loading
            </button>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell eyebrow="PathFinder" title="Choose a career path with clarity" description="Explore careers, matching exams, and roadmap guidance tailored to your goals." compact>
      <PathFinderHero search={search} onSearchChange={setSearch} onExploreClick={handleExploreCareers} />

      <section ref={careersRef} className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-muted dark:text-brand-dark-muted mb-2">Popular Career Goals</p>
            <h2 className="text-2xl md:text-3xl font-black text-brand-text dark:text-brand-dark-text">Choose a path to explore</h2>
          </div>
          <p className="hidden sm:block text-sm text-brand-muted dark:text-brand-dark-muted">{filteredCareers.length} career{filteredCareers.length !== 1 ? 's' : ''} found</p>
        </div>

        {filteredCareers.length === 0 ? (
          <div className="text-center py-16 border border-gray-100 dark:border-brand-dark-border rounded-2xl">
            <SearchX size={44} className="mx-auto text-gray-300 dark:text-brand-dark-muted mb-4" />
            <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text mb-2">No career goals found</h3>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted">Try searching for AI, defense, data, civil services, or engineering.</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredCareers.map((career) => (
                <CareerCard key={career.id} career={career} onSelect={handleSelectCareer} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {selectedCareer && (
        <section ref={detailsRef} className="max-w-7xl mx-auto px-4 pb-12 scroll-mt-24">
          <CareerDetails career={selectedCareer} />

          <div className="mt-8 lg:flex gap-6">
            <FilterSidebar
              showOnlyEligible={showOnlyEligible}
              onShowOnlyEligibleChange={setShowOnlyEligible}
              examTypes={examTypes}
              onExamTypesChange={setExamTypes}
              statuses={statuses}
              onStatusesChange={setStatuses}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />

            <main className="flex-1 min-w-0">
              <div className="lg:hidden card p-4 mb-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text">Filters</h3>
                  <label className="flex items-center gap-2 text-xs font-semibold text-brand-muted dark:text-brand-dark-muted">
                    <input
                      type="checkbox"
                      checked={showOnlyEligible}
                      onChange={(event) => setShowOnlyEligible(event.target.checked)}
                      className="w-4 h-4 accent-primary-500"
                    />
                    Eligible only
                  </label>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {mobileExamTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setExamTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type])}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        examTypes.includes(type)
                          ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black'
                          : 'bg-gray-50 dark:bg-white/5 text-brand-muted dark:text-brand-dark-muted'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                  {mobileStatuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatuses((current) => current.includes(status) ? current.filter((item) => item !== status) : [...current, status])}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        statuses.includes(status)
                          ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black'
                          : 'bg-gray-50 dark:bg-white/5 text-brand-muted dark:text-brand-dark-muted'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="input mt-2 text-sm"
                >
                  {mobileSortOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">Related Exams</h2>
                  <p className="text-sm text-brand-muted dark:text-brand-dark-muted">{selectedExamRows.length} exam{selectedExamRows.length !== 1 ? 's' : ''} matched for {selectedCareer.title}</p>
                </div>
              </div>

              {selectedExamRows.length === 0 ? (
                <EmptyState onExplore={handleExploreCareers} />
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {selectedExamRows.map(({ exam, isEligible }) => (
                    <ExamCard key={exam.id} exam={exam} isEligible={isEligible} />
                  ))}
                </div>
              )}

              <RecommendedSection
                selectedCareer={selectedCareer}
                recommendations={getRelatedCareers(selectedCareer)}
                onSelect={handleSelectCareer}
              />
            </main>
          </div>
        </section>
      )}

      {!selectedCareer && (
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <div className="rounded-2xl border border-gray-100 dark:border-brand-dark-border bg-gray-50 dark:bg-brand-dark-card p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">Select a career to unlock exams and roadmap details</h2>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-1">Start with a popular goal and compare eligibility, exams, skills, and future opportunities.</p>
            </div>
            <button
              onClick={() => careerPaths[0] && handleSelectCareer(careerPaths[0])}
              className="btn-primary justify-center"
              disabled={careerPaths.length === 0}
            >
              Start with {careerPaths[0]?.title || 'Popular Path'}
            </button>
          </div>
        </section>
      )}
    </PageShell>
  )
}
