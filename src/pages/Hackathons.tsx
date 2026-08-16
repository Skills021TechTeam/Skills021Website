import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Calendar, MapPin, Users, Clock, Search,
  ArrowRight, ShieldAlert, Sparkles, Filter, CheckCircle2, ChevronRight
} from 'lucide-react'
import { fetchHackathons } from '../lib/hackathonService'
import { Hackathon, HackathonStatus } from '../features/hackathons/types'

// Dynamic Countdown Ticker
function CountdownTicker({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; mins: number; secs: number; expired: boolean }>({
    days: 0, hours: 0, mins: 0, secs: 0, expired: false
  })

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0, expired: true })
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const secs = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft({ days, hours, mins, secs, expired: false })
      }
    }
    calc()
    const timer = setInterval(calc, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  if (timeLeft.expired) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40">
        <Clock size={12} /> Registration Closed
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
      <Clock size={12} className="animate-pulse" />
      <span>
        Closes in: {String(timeLeft.days).padStart(2, '0')}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.mins).padStart(2, '0')}m {String(timeLeft.secs).padStart(2, '0')}s
      </span>
    </span>
  )
}

export default function Hackathons() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await fetchHackathons()
      setHackathons(data)
      setLoading(false)
    }
    loadData()
  }, [])

  const filteredHackathons = hackathons.filter(h => {
    const matchesTab = activeTab === 'all' || h.status === activeTab
    const matchesSearch =
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.venue.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  // Stats calculation
  const totalHackathons = hackathons.length
  const activeCount = hackathons.filter(h => h.status === 'ongoing' || h.status === 'upcoming').length
  const totalTeams = hackathons.reduce((acc, h) => acc + h.currentTeams, 0)

  return (
    <div className="min-h-screen pt-20 pb-16 bg-gray-50 dark:bg-[#0B0F17] text-brand-text dark:text-brand-dark-text transition-colors duration-200">
      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary-900/10 via-transparent to-transparent py-12 lg:py-16">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 mb-4">
                <Sparkles size={14} className="text-primary-500" /> Skills021 Hackathon Arena
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                Build, Innovate & <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-emerald-400 to-teal-400">Compete Live</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                Step into real-world developer challenges, form dynamic teams, unlock multi-round leaderboards, and showcase your skills to the world.
              </p>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
              <div className="bg-white dark:bg-white/5 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-2xl sm:text-3xl font-extrabold text-primary-500">{totalHackathons}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Total Events</p>
              </div>
              <div className="bg-white dark:bg-white/5 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-500">{activeCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Active Now</p>
              </div>
              <div className="bg-white dark:bg-white/5 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-500">{totalTeams}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Teams Registered</p>
              </div>
            </div>
          </div>

          {/* ── Controls: Search & Tabs ── */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200 dark:border-white/10">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 w-full sm:w-auto overflow-x-auto">
              {[
                { id: 'all', label: 'All Hackathons' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'ongoing', label: 'Ongoing' },
                { id: 'completed', label: 'Completed' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search hackathons, topics, venue..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Hackathons Grid ── */}
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-96 rounded-3xl bg-gray-200 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredHackathons.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/10 p-8">
            <Trophy size={48} className="mx-auto text-gray-400 mb-3 opacity-50" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Hackathons Found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
              There are no hackathons matching your search query or selected filter tab right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredHackathons.map(hackathon => {
              const isUpcoming = hackathon.status === 'upcoming'
              const isOngoing = hackathon.status === 'ongoing'
              const isCompleted = hackathon.status === 'completed'

              return (
                <motion.div
                  key={hackathon.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="group relative bg-white dark:bg-[#131926] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col"
                >
                  {/* Banner Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-gray-900">
                    <img
                      src={hackathon.bannerUrl}
                      alt={hackathon.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131926] via-transparent to-black/30" />

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      {isOngoing && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" /> Live Ongoing
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-md">
                          Upcoming
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-600 text-white shadow-md">
                          Completed
                        </span>
                      )}
                    </div>

                    {/* Team Count Badge */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white border border-white/20">
                      {hackathon.currentTeams}/{hackathon.maxTeams} Teams
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Countdown ticker for active registrations */}
                      {!isCompleted && hackathon.isRegistrationOpen && (
                        <div className="mb-3">
                          <CountdownTicker deadline={hackathon.registrationDeadline} />
                        </div>
                      )}

                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors line-clamp-2">
                        {hackathon.title}
                      </h3>

                      <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {hackathon.description}
                      </p>

                      {/* Meta information tags */}
                      <div className="mt-5 space-y-2.5 pt-4 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-primary-500 flex-shrink-0" />
                          <span>
                            {new Date(hackathon.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(hackathon.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-emerald-500 flex-shrink-0" />
                          <span className="truncate">{hackathon.venue}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-amber-500 flex-shrink-0" />
                          <span>
                            Team Size: {hackathon.minTeamSize === hackathon.maxTeamSize ? `${hackathon.minTeamSize} member` : `${hackathon.minTeamSize} - ${hackathon.maxTeamSize} members`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-3">
                      <div className="text-xs font-medium text-gray-400">
                        {hackathon.numberOfRounds} Rounds • {hackathon.numberOfDays} {hackathon.numberOfDays === 1 ? 'Day' : 'Days'}
                      </div>
                      <Link
                        to={`/hackathons/${hackathon.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-md group-hover:gap-2"
                      >
                        {isCompleted ? 'View Leaderboard' : 'Details & Register'} <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
