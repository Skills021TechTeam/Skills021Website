import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Calendar, MapPin, Users, ArrowRight, Sparkles, Clock } from 'lucide-react'
import { fetchHackathons } from '../lib/hackathonService'
import { Hackathon } from '../features/hackathons/types'

export default function HomeHackathonsSection() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchHackathons()
        setHackathons(data.filter(h => h.status !== 'completed').slice(0, 3))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || hackathons.length === 0) return null

  return (
    <section className="relative z-10 py-16 bg-gray-50/50 dark:bg-white/[0.02] border-y border-gray-200/50 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary-500/10 text-primary-500 mb-3 border border-primary-500/20">
              <Sparkles size={13} /> Live Competitions
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Featured <span className="gradient-text">Hackathons</span>
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Join active developer challenges, build with teams, and compete on live leaderboards.
            </p>
          </div>

          <Link
            to="/hackathons"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary-500 hover:text-primary-600 transition-colors group"
          >
            Explore All Hackathons <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {hackathons.map((h) => (
            <motion.div
              key={h.id}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-[#131926] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-lg flex flex-col justify-between"
            >
              <div className="relative h-44 w-full bg-gray-900 overflow-hidden">
                <img src={h.bannerUrl} alt={h.title} className="w-full h-full object-cover opacity-80" />
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-md ${
                    h.status === 'ongoing' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-600'
                  }`}>
                    {h.status.toUpperCase()}
                  </span>
                </div>
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-white">
                  {h.currentTeams}/{h.maxTeams} Teams
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{h.title}</h3>
                  <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{h.description}</p>

                  <div className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-primary-500" />
                      <span>{new Date(h.startDate).toLocaleDateString()} — {new Date(h.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-emerald-500" />
                      <span className="truncate">{h.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">{h.numberOfRounds} Rounds</span>
                  <Link
                    to={`/hackathons/${h.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-500 hover:text-primary-600"
                  >
                    View Details <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
