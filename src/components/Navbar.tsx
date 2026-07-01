import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, Sun, Moon, ChevronDown,
  BookOpen, FileText, Users,
  Code2, Target, HelpCircle,
  FileQuestion, ArrowRight, Home, LogIn, LogOut, UserCircle2, LayoutDashboard
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

// ─── Dropdown variants ────────────────────────────────────────────────────────
const dropdownVariants: any = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.1 } },
}

// ─── Mega Menu Data ───────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: Home,
  },
  {
    id: 'courses',
    label: 'Courses',
    path: '/courses',
    icon: BookOpen,
    description: 'Browse all courses across every domain',
    mega: {
      columns: [
        {
          title: 'Foundation Programs',
          icon: BookOpen,
          items: [
            { name: 'Class 1–5', path: '/courses?group=Foundation+Programs&sub=Class+1-5' },
            { name: 'Class 6–8', path: '/courses?group=Foundation+Programs&sub=Class+6-8' },
            { name: 'Class 9–10', path: '/courses?group=Foundation+Programs&sub=Class+9-10' },
            { name: 'Class 11–12', path: '/courses?group=Foundation+Programs&sub=Class+11-12' },
          ],
        },
        {
          title: 'Competitive Exams',
          icon: Target,
          items: [
            { name: 'JEE Preparation', path: '/courses?group=Competitive+Exams&sub=JEE+Preparation' },
            { name: 'NEET Preparation', path: '/courses?group=Competitive+Exams&sub=NEET+Preparation' },
            { name: 'CUET Preparation', path: '/courses?group=Competitive+Exams&sub=CUET+Preparation' },
            { name: 'Olympiads', path: '/courses?group=Competitive+Exams&sub=Olympiads' },
            { name: 'NTSE', path: '/courses?group=Competitive+Exams&sub=NTSE' },
          ],
        },
        {
          title: 'College & Tech',
          icon: Code2,
          items: [
            { name: 'DSA', path: '/courses?group=College+%26+Tech+Courses&sub=DSA' },
            { name: 'Web Development', path: '/courses?group=College+%26+Tech+Courses&sub=Web+Development' },
            { name: 'App Development', path: '/courses?group=College+%26+Tech+Courses&sub=App+Development' },
            { name: 'AI & Machine Learning', path: '/courses?group=College+%26+Tech+Courses&sub=AI+%26+Machine+Learning' },
            { name: 'Data Science', path: '/courses?group=College+%26+Tech+Courses&sub=Data+Science' },
            { name: 'Cyber Security', path: '/courses?group=College+%26+Tech+Courses&sub=Cyber+Security' },
            { name: 'Cloud Computing', path: '/courses?group=College+%26+Tech+Courses&sub=Cloud+Computing' },
            { name: 'Interview Prep', path: '/courses?group=College+%26+Tech+Courses&sub=Interview+Preparation' },
          ],
        },
      ],
      cta: { label: 'Browse All Courses', path: '/courses' },
    },
  },
  {
    id: 'resources',
    label: 'Resources',
    path: '/resources',
    icon: FileText,
    description: 'Notes, PDFs, coding resources & more',
    mega: {
      grid: [
        { name: 'Notes & PDFs', path: '/resources?type=Notes', icon: FileText, desc: 'Subject-wise handwritten & typed notes' },
        { name: 'Previous Year Papers', path: '/resources?type=Previous+Year+Papers', icon: FileQuestion, desc: 'PYQs with solutions for all exams' },
        { name: 'E-Books', path: '/resources?type=E-Books', icon: BookOpen, desc: 'Digital books & reference material' },
        { name: 'Cheat Sheets', path: '/resources?type=Cheat+Sheets', icon: FileText, desc: 'Quick revision cards & formulas' },
        { name: 'Interview Questions', path: '/resources?type=Interview+Questions', icon: Users, desc: 'Company-wise interview preparation' },
        { name: 'Coding Resources', path: '/resources?type=Coding+Resources', icon: Code2, desc: 'DSA sheets, patterns & templates' },
      ],
      cta: { label: 'Explore All Resources', path: '/resources' },
    },
  },
]

// ─── Dropdown Panel Components ─────────────────────────────────────────────────

function MegaMenuColumns({ item, onClose }: { item: typeof NAV_ITEMS[0]; onClose: () => void }) {
  if (!item.mega) return null
  const { columns, cta } = item.mega as any
  return (
    <motion.div
      variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
      className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[680px] bg-white dark:bg-brand-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-brand-dark-border z-50 overflow-hidden"
    >
      {/* Top accent bar */}
      <div className="h-[2px] bg-primary-500" />

      {/* Page link banner */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-brand-dark-border">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-muted dark:text-brand-dark-muted">Explore</p>
          <h3 className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">{item.description}</h3>
        </div>
        <Link
          to={item.path}
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0A0A0A] text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          Open {item.label} Page <ArrowRight size={12} />
        </Link>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 gap-0 p-5">
        {columns.map((col: any) => (
          <div key={col.title} className="pr-4 last:pr-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-3 text-brand-muted dark:text-brand-dark-muted">
              <col.icon size={11} /> {col.title}
            </div>
            <div className="space-y-0.5">
              {col.items.map((link: any) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={onClose}
                  className="flex items-center justify-between group px-2.5 py-1.5 rounded-lg text-sm text-brand-muted dark:text-brand-dark-muted hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                >
                  <span>{link.name}</span>
                  <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {cta && (
        <div className="px-5 pb-4 border-t border-gray-100 dark:border-brand-dark-border pt-3">
          <Link
            to={cta.path}
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-600"
          >
            {cta.label} <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </motion.div>
  )
}

function MegaMenuGrid({ item, onClose }: { item: typeof NAV_ITEMS[0]; onClose: () => void }) {
  if (!item.mega) return null
  const { grid, cta } = item.mega as any
  return (
    <motion.div
      variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
      className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[600px] bg-white dark:bg-brand-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-brand-dark-border z-50 overflow-hidden"
    >
      <div className="h-[2px] bg-primary-500" />

      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-brand-dark-border">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-muted dark:text-brand-dark-muted">Library</p>
          <h3 className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">{item.description}</h3>
        </div>
        <Link
          to={item.path}
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0A0A0A] text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          Open Resources <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-4">
        {grid.map((link: any) => (
          <Link
            key={link.name}
            to={link.path}
            onClick={onClose}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group border border-transparent hover:border-gray-100 dark:hover:border-brand-dark-border"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0 text-brand-muted dark:text-brand-dark-muted">
              <link.icon size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-text dark:text-brand-dark-text group-hover:text-primary-500 transition-colors">{link.name}</p>
              <p className="text-[11px] text-brand-muted dark:text-brand-dark-muted leading-snug">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {cta && (
        <div className="px-5 pb-4 border-t border-gray-100 dark:border-brand-dark-border pt-3">
          <Link
            to={cta.path}
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-600"
          >
            {cta.label} <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </motion.div>
  )
}

function SimpleDropdown({ item, onClose }: { item: typeof NAV_ITEMS[0]; onClose: () => void }) {
  const links = (item as any).simple
  const cta = (item as any).cta
  if (!links) return null
  return (
    <motion.div
      variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
      className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-brand-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-brand-dark-border z-50 overflow-hidden"
    >
      <div className="h-[2px] bg-primary-500" />

      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-brand-dark-border">
        <p className="text-xs font-bold text-brand-text dark:text-brand-dark-text">{item.label}</p>
        <Link
          to={item.path}
          onClick={onClose}
          className="text-[11px] font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-0.5"
        >
          View All <ArrowRight size={11} />
        </Link>
      </div>

      <div className="p-2">
        {links.map((link: any) => (
          <Link
            key={link.name}
            to={link.path}
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
          >
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-brand-muted dark:text-brand-dark-muted">
              <link.icon size={13} />
            </div>
            <span className="text-sm text-brand-muted dark:text-brand-dark-muted group-hover:text-brand-text dark:group-hover:text-brand-dark-text transition-colors">{link.name}</span>
            <ArrowRight size={11} className="ml-auto opacity-0 group-hover:opacity-100 text-brand-muted transition-opacity" />
          </Link>
        ))}
      </div>

      {cta && (
        <div className="px-3 py-3 border-t border-gray-100 dark:border-brand-dark-border">
          <Link
            to={cta.path}
            onClick={onClose}
            className="w-full block text-center py-2 bg-[#0A0A0A] text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors"
          >
            {cta.label}
          </Link>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Navbar ─────────────────────────────────────────────────────────────
export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('skills021_theme') === 'dark')
  const { user, isAuthenticated, logout } = useAuthStore()
  const location = useLocation()
  const navRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Dark mode sync
  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('skills021_theme', 'dark') }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('skills021_theme', 'light') }
  }, [darkMode])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setActiveDropdown(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on route change
  useEffect(() => { setMobileOpen(false); setActiveDropdown(null) }, [location])

  const openDropdown = (id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setActiveDropdown(id)
  }
  const closeDropdown = () => {
    timerRef.current = setTimeout(() => setActiveDropdown(null), 120)
  }
  const keepOpen = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const hasDropdown = (item: typeof NAV_ITEMS[0]) => !!(item as any).mega || !!(item as any).simple

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(path)

  // Show all items in desktop nav
  const primaryItems = NAV_ITEMS.slice(0, 7)
  const secondaryItems = NAV_ITEMS.slice(7)

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 dark:bg-brand-dark-bg/95 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-brand-dark-border'
          : 'bg-white dark:bg-brand-dark-bg border-b border-gray-200 dark:border-brand-dark-border'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo: text only, no icon ── */}
          <Link to="/" className="flex-shrink-0">
            <span className="text-xl font-black text-[#0A0A0A] dark:text-white tracking-tight hover:opacity-80 transition-opacity">
              SKILL021
            </span>
          </Link>

          {/* ── Desktop Navigation ── */}
          <div className="hidden xl:flex items-center gap-0.5">
            {primaryItems.map(item => (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => hasDropdown(item) && openDropdown(item.id)}
                onMouseLeave={closeDropdown}
              >
                {/* The nav item itself — ALWAYS navigates on click */}
                <Link
                  to={item.path}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    isActive(item.path)
                      ? 'text-[#0A0A0A] dark:text-white bg-gray-100 dark:bg-white/10'
                      : 'text-gray-500 dark:text-gray-400 hover:text-[#0A0A0A] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8'
                  }`}
                >
                  {item.label}
                  {hasDropdown(item) && (
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-150 opacity-50 ${activeDropdown === item.id ? 'rotate-180' : ''}`}
                    />
                  )}
                </Link>

                {/* Active indicator bar */}
                {isActive(item.path) && (
                  <motion.div
                    layoutId="nav-active-bar"
                    className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary-500 rounded-full"
                  />
                )}

                {/* Dropdown panel */}
                <AnimatePresence>
                  {activeDropdown === item.id && hasDropdown(item) && (
                    <div
                      onMouseEnter={keepOpen}
                      onMouseLeave={closeDropdown}
                    >
                      {item.mega && (item.mega as any).columns && (
                        <MegaMenuColumns item={item} onClose={() => setActiveDropdown(null)} />
                      )}
                      {item.mega && (item.mega as any).grid && (
                        <MegaMenuGrid item={item} onClose={() => setActiveDropdown(null)} />
                      )}
                      {(item as any).simple && (
                        <SimpleDropdown item={item} onClose={() => setActiveDropdown(null)} />
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* Secondary items */}
            {secondaryItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive(item.path)
                    ? 'text-[#0A0A0A] dark:text-white bg-gray-100 dark:bg-white/10'
                    : 'text-gray-500 dark:text-gray-400 hover:text-[#0A0A0A] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* ── Right Side Controls ── */}
          <div className="hidden xl:flex items-center gap-2">
            {/* Dark Mode */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Auth Buttons */}
            {isAuthenticated && user ? (
              <>
                <Link
                  to={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-[#0A0A0A] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
                >
                  <LayoutDashboard size={14} />
                  Dashboard
                </Link>
                <div className="w-px h-5 bg-gray-200 dark:bg-white/10" />
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                >
                  <LogOut size={14} />
                  Logout
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-white/10" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10">
                  <UserCircle2 size={16} className="text-primary-500" />
                  <span className="text-[13px] font-semibold text-[#0A0A0A] dark:text-white max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold text-gray-600 dark:text-gray-300 hover:text-[#0A0A0A] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#0A0A0A] dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile Controls ── */}
          <div className="xl:hidden flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden bg-white dark:bg-brand-dark-bg border-t border-gray-200 dark:border-brand-dark-border overflow-hidden max-h-[80vh] overflow-y-auto"
          >
            <div className="px-4 py-3 space-y-0.5">
              {NAV_ITEMS.map(item => {
                const hasExpand = !!(item as any).mega || !!(item as any).simple
                const subItems = (item as any).simple || ((item as any).mega && (item as any).mega.columns?.flatMap((c: any) => c.items.slice(0, 3))) || []

                return (
                  <div key={item.id}>
                    <div className="flex items-center">
                      {/* Main link — always navigates */}
                      <Link
                        to={item.path}
                        className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-l-xl text-sm font-semibold transition-colors ${
                          isActive(item.path)
                            ? 'bg-gray-100 dark:bg-white/10 text-[#0A0A0A] dark:text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <item.icon size={15} className={isActive(item.path) ? 'text-primary-500' : 'text-gray-400'} />
                        {item.label}
                      </Link>
                      {/* Expand toggle */}
                      {hasExpand && (
                        <button
                          onClick={() => setMobileExpanded(mobileExpanded === item.id ? null : item.id)}
                          className={`px-3 py-2.5 rounded-r-xl transition-colors border-l border-gray-100 dark:border-brand-dark-border ${
                            isActive(item.path) ? 'bg-gray-100 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <ChevronDown size={14} className={`text-gray-400 transition-transform ${mobileExpanded === item.id ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Mobile sub-items */}
                    <AnimatePresence>
                      {mobileExpanded === item.id && subItems.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pl-8 py-1 space-y-0.5"
                        >
                          {subItems.map((sub: any) => (
                            <Link
                              key={sub.name}
                              to={sub.path}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                            >
                              <ArrowRight size={11} className="text-gray-300 dark:text-gray-600" />
                              {sub.name}
                            </Link>
                          ))}
                          <Link
                            to={item.path}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary-500 hover:underline"
                          >
                            View all {item.label} <ArrowRight size={11} />
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}

              {/* Mobile Auth Buttons */}
              <div className="pt-3 border-t border-gray-100 dark:border-brand-dark-border mt-1">
                {isAuthenticated && user ? (
                  <div className="space-y-0.5">
                    <Link
                      to={user.role === 'admin' ? '/admin' : '/dashboard'}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <LayoutDashboard size={15} className="text-primary-500" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); setMobileOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                    >
                      <LogOut size={15} />
                      Logout ({user.name.split(' ')[0]})
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pb-2">
                    <Link
                      to="/login"
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-gray-200 dark:border-brand-dark-border text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <LogIn size={15} /> Log In
                    </Link>
                    <Link
                      to="/register"
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-[#0A0A0A] dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100"
                    >
                      Sign Up — It's Free
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
