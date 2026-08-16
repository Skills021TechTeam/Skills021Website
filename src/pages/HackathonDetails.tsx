import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import {
  Trophy, Calendar, MapPin, Users, Clock, ArrowLeft,
  CheckCircle2, XCircle, Download, Search, AlertTriangle,
  QrCode, UserPlus, FileText, Medal, Sparkles, Send, Shield, Info
} from 'lucide-react'
import {
  fetchHackathonById,
  fetchTeams,
  registerTeam,
  isTeamQualifiedForRound,
} from '../lib/hackathonService'
import {
  Hackathon,
  HackathonTeam,
  TeamMember,
  RegisterTeamInput,
} from '../features/hackathons/types'

export default function HackathonDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [hackathon, setHackathon] = useState<Hackathon | null>(null)
  const [teams, setTeams] = useState<HackathonTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'register' | 'ticket' | 'leaderboard'>('overview')

  // Registration Form State
  const [teamName, setTeamName] = useState('')
  const [leaderName, setLeaderName] = useState('')
  const [leaderEmail, setLeaderEmail] = useState('')
  const [leaderCollege, setLeaderCollege] = useState('')
  const [leaderBranch, setLeaderBranch] = useState('')
  const [members, setMembers] = useState<TeamMember[]>([])

  const [registeredTeam, setRegisteredTeam] = useState<HackathonTeam | null>(null)
  const [registering, setRegistering] = useState(false)

  // Leaderboard Tab State
  const [selectedRound, setSelectedRound] = useState<number>(1)
  const [leaderboardSearch, setLeaderboardSearch] = useState('')
  const [showWastedBanner, setShowWastedBanner] = useState(false)
  const [eliminatedTeamName, setEliminatedTeamName] = useState('')
  const [eliminationRound, setEliminationRound] = useState<number | null>(null)
  const [podiumRevealed, setPodiumRevealed] = useState(false)

  // Ticket QR State
  const [qrDataUrl, setQrDataUrl] = useState('')
  const ticketRef = useRef<HTMLDivElement>(null)
  const [downloadingTicket, setDownloadingTicket] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      const data = await fetchHackathonById(id)
      if (data) {
        setHackathon(data)
        setSelectedRound(data.currentRound || 1)
        // Initialize members array based on minTeamSize
        const initialMembers: TeamMember[] = Array.from({ length: Math.max(1, data.minTeamSize) }, (_, i) => ({
          name: i === 0 ? '' : '',
          rollNumber: '',
          college: '',
          branch: '',
        }))
        setMembers(initialMembers)

        const teamList = await fetchTeams(id)
        setTeams(teamList)
      }
      setLoading(false)
    }
    load()
  }, [id])

  // Sync leader name into member 0
  useEffect(() => {
    if (members.length > 0) {
      setMembers(prev => {
        const copy = [...prev]
        copy[0] = {
          ...copy[0],
          name: leaderName,
          college: copy[0].college || leaderCollege,
          branch: copy[0].branch || leaderBranch,
        }
        return copy
      })
    }
  }, [leaderName, leaderCollege, leaderBranch])

  // Generate QR Code when registeredTeam changes
  useEffect(() => {
    if (registeredTeam && hackathon) {
      const payload = `${hackathon.id}|${registeredTeam.id}|${registeredTeam.teamCode}`
      QRCode.toDataURL(payload, { width: 300, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' } })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR generation error:', err))
    }
  }, [registeredTeam, hackathon])

  // Add / Remove Member fields
  const addMemberField = () => {
    if (!hackathon) return
    if (members.length >= hackathon.maxTeamSize) {
      toast.error(`Maximum team size for this hackathon is ${hackathon.maxTeamSize}`)
      return
    }
    setMembers([
      ...members,
      { name: '', rollNumber: '', college: leaderCollege, branch: leaderBranch }
    ])
  }

  const removeMemberField = (index: number) => {
    if (!hackathon) return
    if (members.length <= hackathon.minTeamSize) {
      toast.error(`Minimum team size for this hackathon is ${hackathon.minTeamSize}`)
      return
    }
    setMembers(members.filter((_, i) => i !== index))
  }

  const handleMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...members]
    updated[index] = { ...updated[index], [field]: value }
    setMembers(updated)
  }

  // Handle Team Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hackathon) return

    if (!teamName.trim() || !leaderName.trim() || !leaderEmail.trim()) {
      toast.error('Please fill in team name and leader details.')
      return
    }

    // Member validation
    for (let i = 0; i < members.length; i++) {
      if (!members[i].name.trim()) {
        toast.error(`Please provide name for Member ${i + 1}`)
        return
      }
    }

    setRegistering(true)
    try {
      const input: RegisterTeamInput = {
        hackathonId: hackathon.id,
        teamName: teamName.trim(),
        leaderName: leaderName.trim(),
        leaderEmail: leaderEmail.trim(),
        leaderCollege: leaderCollege.trim() || 'Skills021 Member',
        leaderBranch: leaderBranch.trim() || 'General Tech',
        members: members.map(m => ({
          ...m,
          college: m.college || leaderCollege || 'Skills021 Member',
          branch: m.branch || leaderBranch || 'General Tech',
        })),
      }

      const team = await registerTeam(input)
      setRegisteredTeam(team)
      setTeams(prev => [...prev, team])
      setHackathon(prev => prev ? { ...prev, currentTeams: prev.currentTeams + 1 } : null)

      toast.success('🎉 Team registered successfully! Boarding pass ticket generated.')
      setActiveSubTab('ticket')
    } catch (err: any) {
      toast.error(err.message || 'Failed to register team.')
    } finally {
      setRegistering(false)
    }
  }

  // Handle Boarding Pass Download
  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return
    setDownloadingTicket(true)
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0F172A',
      })
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${hackathon?.title.replace(/[^a-zA-Z0-9]/g, '_')}_Ticket_${registeredTeam?.teamCode}.png`
      link.click()
      toast.success('Boarding Pass PNG saved!')
    } catch (err) {
      toast.error('Failed to download ticket PNG.')
    } finally {
      setDownloadingTicket(false)
    }
  }

  // Podium celebration
  const triggerPodiumConfetti = () => {
    setPodiumRevealed(true)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })
  }

  // Search logic for Leaderboard & WASTED check
  const handleLeaderboardSearchChange = (val: string) => {
    setLeaderboardSearch(val)
    if (!val.trim()) {
      setShowWastedBanner(false)
      return
    }

    // Check if searched team was eliminated in selectedRound or any preceding round
    const searchNorm = val.trim().toLowerCase()
    const matchedTeam = teams.find(
      t => t.teamName.toLowerCase().includes(searchNorm) || t.teamCode.toLowerCase().includes(searchNorm)
    )

    if (matchedTeam) {
      let failedRound: number | null = null
      for (let r = 1; r <= selectedRound; r++) {
        if (matchedTeam.qualifications[String(r)] !== true) {
          failedRound = r
          break
        }
      }

      if (failedRound !== null) {
        setEliminatedTeamName(matchedTeam.teamName)
        setEliminationRound(failedRound)
        setShowWastedBanner(true)
      } else {
        setShowWastedBanner(false)
      }
    } else {
      setShowWastedBanner(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center bg-gray-50 dark:bg-[#0B0F17]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading Hackathon details...</p>
        </div>
      </div>
    )
  }

  if (!hackathon) {
    return (
      <div className="min-h-screen pt-24 pb-16 text-center bg-gray-50 dark:bg-[#0B0F17]">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hackathon Not Found</h2>
        <Link to="/hackathons" className="mt-4 inline-flex items-center gap-2 btn-primary py-2 px-4 text-sm">
          <ArrowLeft size={16} /> Back to Hackathons
        </Link>
      </div>
    )
  }

  // Leaderboard Filtering: Only include teams that are QUALIFIED in the currently selected round
  const eligibleRoundTeams = teams.filter(t => isTeamQualifiedForRound(t, selectedRound) && t.qualifications[String(selectedRound)] === true)
  const filteredLeaderboardTeams = eligibleRoundTeams.filter(t => {
    if (!leaderboardSearch.trim()) return true
    const term = leaderboardSearch.toLowerCase()
    return t.teamName.toLowerCase().includes(term) || t.teamCode.toLowerCase().includes(term) || t.leaderName.toLowerCase().includes(term)
  })

  // Podium Winners (Must be qualified in the final round)
  const finalRoundNum = hackathon.numberOfRounds
  const isFinalRoundQualified = (t: HackathonTeam) =>
    isTeamQualifiedForRound(t, finalRoundNum) && t.qualifications[String(finalRoundNum)] === true

  const firstPlace = teams.find(t => t.position === 1 && isFinalRoundQualified(t))
  const secondPlace = teams.find(t => t.position === 2 && isFinalRoundQualified(t))
  const thirdPlace = teams.find(t => t.position === 3 && isFinalRoundQualified(t))
  const hasPodiumWinners = !!(firstPlace || secondPlace || thirdPlace)

  const isRegistrationClosed =
    !hackathon.isRegistrationOpen ||
    hackathon.status === 'ongoing' ||
    hackathon.status === 'completed' ||
    new Date() > new Date(hackathon.registrationDeadline) ||
    hackathon.currentTeams >= hackathon.maxTeams

  return (
    <div className="min-h-screen pt-20 pb-16 bg-gray-50 dark:bg-[#0B0F17] text-brand-text dark:text-brand-dark-text">
      {/* ── Top Header Banner ── */}
      <div className="relative bg-gray-900 text-white overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0">
          <img src={hackathon.bannerUrl} alt={hackathon.title} className="w-full h-full object-cover opacity-20 blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/80 to-transparent" />
        </div>

        <div className="relative max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link to="/hackathons" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft size={14} /> Back to All Hackathons
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  hackathon.status === 'ongoing' ? 'bg-emerald-500 text-white animate-pulse' :
                  hackathon.status === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                }`}>
                  {hackathon.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {hackathon.currentTeams}/{hackathon.maxTeams} Teams Registered
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">{hackathon.title}</h1>
              <p className="mt-2 text-sm sm:text-base text-gray-300 max-w-3xl leading-relaxed">{hackathon.description}</p>
            </div>

            {/* Sub-Tab Quick Switches */}
            {!isRegistrationClosed ? (
              <button
                onClick={() => setActiveSubTab('register')}
                className="flex-shrink-0 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-teal-400 text-white font-bold text-sm shadow-xl hover:opacity-90 transition-all"
              >
                Register Team Now
              </button>
            ) : (
              <button
                onClick={() => setActiveSubTab('leaderboard')}
                className="flex-shrink-0 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-xl hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Trophy size={16} /> View Standings
              </button>
            )}
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="mt-8 flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-1">
            {[
              { id: 'overview', label: 'Overview & Rules', icon: Info },
              { id: 'register', label: `Team Registration${isRegistrationClosed ? ' (Closed)' : ''}`, icon: UserPlus },
              { id: 'ticket', label: 'Digital Ticket', icon: QrCode },
              { id: 'leaderboard', label: 'Leaderboard & Results', icon: Trophy },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${
                  activeSubTab === tab.id
                    ? 'border-primary-500 text-primary-400 bg-white/5'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sub-Tab Main Body ── */}
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <AnimatePresence mode="wait">

          {/* 1. OVERVIEW TAB */}
          {activeSubTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-[#131926] rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">About the Hackathon</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{hackathon.description}</p>
                </div>

                <div className="bg-white dark:bg-[#131926] rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Official Rules & Guidelines</h3>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed border border-gray-200 dark:border-white/5">
                    {hackathon.rules || 'Standard hackathon code of conduct applies.'}
                  </div>
                </div>
              </div>

              {/* Sidebar Info Card */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#131926] rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-4">Key Event Details</h4>

                  <div className="space-y-4 text-xs sm:text-sm">
                    <div className="flex items-start gap-3">
                      <Calendar size={18} className="text-primary-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Start & End Date</p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {new Date(hackathon.startDate).toLocaleString()} — {new Date(hackathon.endDate).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock size={18} className="text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Registration Deadline</p>
                        <p className="text-gray-500 dark:text-gray-400">{new Date(hackathon.registrationDeadline).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin size={18} className="text-emerald-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Venue / Location</p>
                        <p className="text-gray-500 dark:text-gray-400">{hackathon.venue}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Users size={18} className="text-teal-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Team Constraints</p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {hackathon.minTeamSize} to {hackathon.maxTeamSize} members per team
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. TEAM REGISTRATION TAB */}
          {activeSubTab === 'register' && (
            <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto">
              {isRegistrationClosed ? (
                <div className="bg-white dark:bg-[#131926] rounded-3xl p-8 sm:p-12 border border-gray-200 dark:border-white/10 shadow-xl text-center space-y-4 max-w-xl mx-auto">
                  <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                    <XCircle size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                    Registration is Closed
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    {hackathon.status === 'ongoing' ? (
                      <>This hackathon is currently <span className="font-bold text-emerald-500 uppercase">ONGOING (Active)</span>. New team registrations are closed.</>
                    ) : hackathon.status === 'completed' ? (
                      <>This hackathon has <span className="font-bold text-gray-400 uppercase">COMPLETED</span>. Registrations are no longer accepted.</>
                    ) : hackathon.currentTeams >= hackathon.maxTeams ? (
                      <>This hackathon has reached its maximum capacity of <strong>{hackathon.maxTeams} teams</strong>.</>
                    ) : (
                      <>Registration for this hackathon is currently closed by event organizers or the registration deadline has passed.</>
                    )}
                  </p>
                  <div className="pt-3">
                    <button
                      onClick={() => setActiveSubTab('leaderboard')}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-md hover:opacity-90 transition-all inline-flex items-center gap-2"
                    >
                      <Trophy size={15} /> View Leaderboard & Standings
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#131926] rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-xl">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Register Your Team</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Fill in leader details and add team members ({hackathon.minTeamSize}–{hackathon.maxTeamSize} members allowed).
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-6">
                    {/* Team Name */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                        Team Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={teamName}
                        onChange={e => setTeamName(e.target.value)}
                        placeholder="e.g. CyberKnights"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>

                    {/* Leader Info Box */}
                    <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-5 space-y-4">
                      <h4 className="text-sm font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                        <UserPlus size={16} /> Team Leader Details
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Leader Full Name *</label>
                          <input
                            type="text"
                            required
                            value={leaderName}
                            onChange={e => setLeaderName(e.target.value)}
                            placeholder="Alex Rivera"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Leader Email *</label>
                          <input
                            type="email"
                            required
                            value={leaderEmail}
                            onChange={e => setLeaderEmail(e.target.value)}
                            placeholder="alex@college.edu"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">College / Institution</label>
                          <input
                            type="text"
                            value={leaderCollege}
                            onChange={e => setLeaderCollege(e.target.value)}
                            placeholder="Apex Tech Institute"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Branch / Department</label>
                          <input
                            type="text"
                            value={leaderBranch}
                            onChange={e => setLeaderBranch(e.target.value)}
                            placeholder="Computer Science"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Team Members List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Team Members ({members.length} / {hackathon.maxTeamSize})
                        </h4>
                        {members.length < hackathon.maxTeamSize && (
                          <button
                            type="button"
                            onClick={addMemberField}
                            className="text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1"
                          >
                            + Add Member
                          </button>
                        )}
                      </div>

                      {members.map((member, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 relative">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              Member {idx + 1} {idx === 0 ? '(Leader)' : ''}
                            </span>
                            {idx > 0 && members.length > hackathon.minTeamSize && (
                              <button
                                type="button"
                                onClick={() => removeMemberField(idx)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Full Name *"
                              required
                              value={member.name}
                              onChange={e => handleMemberChange(idx, 'name', e.target.value)}
                              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-gray-900 dark:text-white"
                            />
                            <input
                              type="email"
                              placeholder="Email Address *"
                              required
                              value={member.email}
                              onChange={e => handleMemberChange(idx, 'email', e.target.value)}
                              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {registering ? 'Registering Team...' : 'Complete Registration'}
                  </button>
                </form>
              </div>
              )}
            </motion.div>
          )}

          {/* 3. DIGITAL BOARDING PASS TICKET TAB */}
          {activeSubTab === 'ticket' && (
            <motion.div key="ticket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto">
              {!registeredTeam ? (
                <div className="bg-white dark:bg-[#131926] rounded-3xl p-8 text-center border border-gray-200 dark:border-white/10">
                  <QrCode size={48} className="mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Active Ticket Loaded</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
                    Register a team first to generate your official Boarding Pass Ticket with QR code.
                  </p>
                  <button onClick={() => setActiveSubTab('register')} className="btn-primary py-2 px-5 text-xs font-bold">
                    Go to Registration
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Digital Boarding Pass Ticket Container */}
                  <div
                    ref={ticketRef}
                    className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-6">
                      <div>
                        <span className="text-[10px] font-bold tracking-widest text-primary-400 uppercase">OFFICIAL HACKATHON PASS</span>
                        <h3 className="text-xl font-black tracking-tight text-white">{hackathon.title}</h3>
                      </div>
                      <div className="bg-primary-500/20 border border-primary-500/30 px-3 py-1 rounded-xl text-xs font-bold text-primary-300">
                        {registeredTeam.teamCode}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                      <div className="sm:col-span-2 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TEAM NAME</p>
                          <p className="text-lg font-extrabold text-white">{registeredTeam.teamName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TEAM LEADER</p>
                          <p className="text-sm font-semibold text-slate-200">{registeredTeam.leaderName} ({registeredTeam.leaderEmail})</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">COLLEGE & BRANCH</p>
                          <p className="text-xs text-slate-300">{registeredTeam.leaderCollege} • {registeredTeam.leaderBranch}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL MEMBERS</p>
                          <p className="text-xs text-emerald-400 font-semibold">{registeredTeam.members.length} Confirmed Members</p>
                        </div>
                      </div>

                      {/* QR Code Canvas */}
                      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-inner">
                        {qrDataUrl ? (
                          <img src={qrDataUrl} alt="QR Code Ticket" className="w-36 h-36" />
                        ) : (
                          <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">Generating QR...</div>
                        )}
                        <p className="text-[9px] font-mono text-slate-600 mt-1">{registeredTeam.teamCode}</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                      <span>VENUE: {hackathon.venue}</span>
                      <span>STATUS: CONFIRMED</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleDownloadTicket}
                      disabled={downloadingTicket}
                      className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-xl hover:bg-emerald-600 transition-all flex items-center gap-2"
                    >
                      <Download size={16} />
                      {downloadingTicket ? 'Generating Image...' : 'Download Boarding Pass (PNG)'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. LEADERBOARD & RESULTS TAB */}
          {activeSubTab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {/* Podium Header Section */}
              <div className="bg-white dark:bg-[#131926] rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-lg text-center relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-left">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Trophy className="text-amber-500" size={24} /> Competition Leaderboard
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Official qualification standings across rounds & final winners reveal.
                    </p>
                  </div>

                  <button
                    onClick={triggerPodiumConfetti}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-md hover:bg-amber-600 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles size={14} /> Reveal Celebration
                  </button>
                </div>

                {/* Podium Cards (1st, 2nd, 3rd) - Only visible when viewing the final round */}
                {selectedRound === hackathon.numberOfRounds ? (
                  hasPodiumWinners ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6 items-end">
                      {/* 2nd Place */}
                      <div className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-5 order-2 md:order-1">
                        <span className="text-3xl">🥈</span>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">2ND PLACE</p>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{secondPlace?.teamName || 'TBD'}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{secondPlace?.leaderName || '-'}</p>
                      </div>

                      {/* 1st Place */}
                      <div className="bg-gradient-to-b from-amber-500/10 to-amber-500/5 border-2 border-amber-500/40 rounded-2xl p-6 order-1 md:order-2 shadow-xl scale-105">
                        <span className="text-4xl">🥇</span>
                        <p className="text-xs font-extrabold text-amber-500 uppercase tracking-widest mt-1">CHAMPION (1ST PLACE)</p>
                        <h4 className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">{firstPlace?.teamName || 'TBD'}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{firstPlace?.leaderName || '-'}</p>
                      </div>

                      {/* 3rd Place */}
                      <div className="bg-amber-900/10 border border-amber-800/20 rounded-2xl p-5 order-3">
                        <span className="text-3xl">🥉</span>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mt-1">3RD PLACE</p>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{thirdPlace?.teamName || 'TBD'}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{thirdPlace?.leaderName || '-'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl text-xs text-gray-500 my-4">
                      Final podium winners have not been assigned by organizers yet. Check round qualifications below!
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl text-xs font-medium text-gray-500 my-4">
                    Podium places will be awarded in Round {hackathon.numberOfRounds} (Final Round). Select Round {hackathon.numberOfRounds} to view final winners once assigned!
                  </div>
                )}
              </div>

              {/* Elimination WASTED Banner Callout */}
              {showWastedBanner && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-red-950/80 border-2 border-red-600 rounded-3xl p-6 text-center text-white shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />
                  <h3 className="text-3xl sm:text-4xl font-black text-red-500 tracking-widest uppercase mb-1">
                    ELIMINATED
                  </h3>
                  <p className="text-base font-bold text-gray-200">
                    Team "<span className="text-red-400">{eliminatedTeamName}</span>" was eliminated in Round {eliminationRound || selectedRound}.
                  </p>
                </motion.div>
              )}

              {/* Round Selector & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                  {Array.from({ length: hackathon.numberOfRounds }, (_, i) => i + 1).map(r => {
                    const qualifiedCount = teams.filter(t => isTeamQualifiedForRound(t, r) && t.qualifications[String(r)] === true).length
                    return (
                      <button
                        key={r}
                        onClick={() => { setSelectedRound(r); setShowWastedBanner(false) }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedRound === r
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10'
                        }`}
                      >
                        Round {r} Qualified ({qualifiedCount})
                      </button>
                    )
                  })}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={leaderboardSearch}
                    onChange={e => handleLeaderboardSearchChange(e.target.value)}
                    placeholder="Search team or code..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Leaderboard Teams Table */}
              <div className="bg-white dark:bg-[#131926] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Code</th>
                        <th className="px-6 py-4">Team Name</th>
                        <th className="px-6 py-4">Leader</th>
                        <th className="px-6 py-4">College</th>
                        <th className="px-6 py-4">Round {selectedRound} Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {filteredLeaderboardTeams.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">
                            {leaderboardSearch.trim()
                              ? 'No teams match your search term.'
                              : `No teams have qualified for Round ${selectedRound} yet.`}
                          </td>
                        </tr>
                      ) : (
                        filteredLeaderboardTeams.map(t => {
                          const isQualified = t.qualifications[String(selectedRound)] === true
                          return (
                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 font-mono font-semibold text-primary-500">{t.teamCode}</td>
                              <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                {t.position === 1 && '🥇 '}
                                {t.position === 2 && '🥈 '}
                                {t.position === 3 && '🥉 '}
                                {t.teamName}
                              </td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{t.leaderName}</td>
                              <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{t.leaderCollege}</td>
                              <td className="px-6 py-4">
                                {isQualified ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={12} /> Qualified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                                    <XCircle size={12} /> Eliminated
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
