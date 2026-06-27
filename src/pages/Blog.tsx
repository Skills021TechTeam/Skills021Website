import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Clock, User, Tag, Search, ArrowRight, TrendingUp, BookOpen, Code2, GraduationCap, Briefcase, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

const CATEGORIES = ['All', 'Coding', 'Exam Tips', 'Counseling', 'Career', 'Hackathons', 'Internships']

const BLOG_POSTS = [
  {
    id: '1',
    title: 'How to Crack JEE 2025 in 90 Days — Complete Study Plan',
    excerpt: 'A detailed, week-by-week study plan covering Physics, Chemistry and Maths for JEE Advanced aspirants with limited time.',
    category: 'Exam Tips',
    author: 'Skill021 Team',
    date: 'June 15, 2025',
    readTime: '8 min read',
    featured: true,
    tags: ['JEE', 'Study Plan', 'Physics', 'Chemistry'],
    gradient: 'from-orange-500 to-red-600',
  },
  {
    id: '2',
    title: 'Top 10 DSA Patterns Every Coder Must Know in 2025',
    excerpt: 'Master the 10 most common DSA patterns — sliding window, two pointers, BFS/DFS, dynamic programming and more with code examples.',
    category: 'Coding',
    author: 'Priya Sharma',
    date: 'June 12, 2025',
    readTime: '12 min read',
    featured: true,
    tags: ['DSA', 'Algorithms', 'LeetCode'],
    gradient: 'from-purple-500 to-indigo-600',
  },
  {
    id: '3',
    title: 'JoSAA Counseling 2025 — Complete Guide to Round-wise Cutoffs',
    excerpt: 'Everything you need to know about JoSAA 2025 counseling rounds, cutoff trends, seat matrix and strategies for getting your dream IIT or NIT.',
    category: 'Counseling',
    author: 'Counseling Team',
    date: 'June 10, 2025',
    readTime: '15 min read',
    featured: true,
    tags: ['JoSAA', 'IIT', 'NIT', 'Cutoffs'],
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    id: '4',
    title: 'From Zero to SDE at Google — My 18-Month Journey',
    excerpt: 'A detailed account of how I cracked Google SDE role starting from basic programming, focusing on DSA, system design and behavioral rounds.',
    category: 'Career',
    author: 'Arjun Mehta',
    date: 'June 8, 2025',
    readTime: '10 min read',
    featured: false,
    tags: ['Google', 'SDE', 'Placement'],
    gradient: 'from-green-500 to-teal-600',
  },
  {
    id: '5',
    title: 'How to Win Your First Hackathon — Strategy & Tips',
    excerpt: 'Hackathon veterans share their proven approach: idea selection, tech stack choices, presentation skills and team coordination tips.',
    category: 'Hackathons',
    author: 'Hackathon Club',
    date: 'June 5, 2025',
    readTime: '7 min read',
    featured: false,
    tags: ['Hackathon', 'Strategy', 'Team'],
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: '6',
    title: 'How to Land a Paid Remote Internship as a 2nd Year Student',
    excerpt: 'Practical steps to find and secure a well-paying remote internship — portfolio building, cold emailing, LinkedIn optimization and more.',
    category: 'Internships',
    author: 'Neha Agarwal',
    date: 'June 3, 2025',
    readTime: '9 min read',
    featured: false,
    tags: ['Internship', 'Remote', 'LinkedIn'],
    gradient: 'from-teal-500 to-cyan-600',
  },
  {
    id: '7',
    title: 'AKTU 2025 Admission: Cutoffs, Branches & College Predictor Guide',
    excerpt: 'Complete breakdown of AKTU 2025 admissions with college-wise and branch-wise cutoffs, and how to use the college predictor effectively.',
    category: 'Counseling',
    author: 'Counseling Team',
    date: 'June 1, 2025',
    readTime: '11 min read',
    featured: false,
    tags: ['AKTU', 'UP Counseling', 'Cutoff'],
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: '8',
    title: 'Flutter vs React Native in 2025 — Which to Learn First?',
    excerpt: 'An in-depth comparison of Flutter and React Native covering performance, job market, learning curve and project complexity.',
    category: 'Coding',
    author: 'Tech Team',
    date: 'May 28, 2025',
    readTime: '6 min read',
    featured: false,
    tags: ['Flutter', 'React Native', 'Mobile Dev'],
    gradient: 'from-primary-500 to-teal-600',
  },
]

const CAT_ICONS: Record<string, typeof BookOpen> = {
  Coding: Code2,
  'Exam Tips': BookOpen,
  Counseling: GraduationCap,
  Career: Briefcase,
  Hackathons: Trophy,
  Internships: Briefcase,
}

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')

  const featured = BLOG_POSTS.filter(p => p.featured)
  const filtered = BLOG_POSTS.filter(p => {
    if (activeCategory !== 'All' && p.category !== activeCategory) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.excerpt.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0F0F1A] via-[#1A1040] to-[#0F0F1A] py-14 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-primary-400 bg-primary-400/10 border border-primary-400/30 rounded-full mb-5 uppercase tracking-widest">
              <MessageSquare size={13} /> Skill021 Blog
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Insights, Tips & <span className="gradient-text">Guides</span>
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto mb-8">
              Expert articles on coding, exam preparation, college admissions, career growth and more — written for Indian students.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Featured Posts */}
        {!search && activeCategory === 'All' && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} className="text-primary-500" />
              <h2 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">Featured Articles</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featured.map((post, idx) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="card overflow-hidden group cursor-pointer"
                >
                  {/* Gradient banner */}
                  <div className={`h-36 bg-gradient-to-br ${post.gradient} relative`}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <MessageSquare size={64} className="text-white" />
                    </div>
                    <span className="absolute top-3 left-3 text-[11px] font-bold bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                      {post.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-2 leading-snug line-clamp-2 group-hover:text-primary-500 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-3 line-clamp-2 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-brand-muted dark:text-brand-dark-muted">
                      <span className="flex items-center gap-1"><User size={10} /> {post.author}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {post.readTime}</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-primary-500 hover:text-primary-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* All Posts */}
        <div className="space-y-4">
          {filtered.map((post, idx) => {
            const CatIcon = CAT_ICONS[post.category] || MessageSquare
            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.07 }}
                whileHover={{ x: 4 }}
                className="card p-5 flex flex-col sm:flex-row gap-4 cursor-pointer group"
              >
                {/* Color stripe */}
                <div className={`flex-shrink-0 w-full sm:w-2 h-2 sm:h-auto rounded-full bg-gradient-to-b ${post.gradient}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full">
                      <CatIcon size={10} /> {post.category}
                    </span>
                    <span className="text-[11px] text-brand-muted dark:text-brand-dark-muted">{post.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text mb-1 group-hover:text-primary-500 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-brand-muted dark:text-brand-dark-muted line-clamp-2 leading-relaxed mb-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-brand-muted dark:text-brand-dark-muted">
                      <span className="flex items-center gap-1"><User size={11} />{post.author}</span>
                      <span className="flex items-center gap-1"><Clock size={11} />{post.readTime}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center">
                  <ArrowRight size={18} className="text-gray-200 dark:text-gray-700 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.article>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <MessageSquare size={48} className="mx-auto text-brand-muted opacity-30 mb-4" />
              <h3 className="text-lg font-semibold text-brand-text dark:text-brand-dark-text">No articles found</h3>
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-2">Try a different category or search term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
