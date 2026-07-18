import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, Clock, Users, ChevronRight, CheckCircle, X, Trophy, RotateCcw, Award } from 'lucide-react'
import { useContentStore, Quiz, QuizCategory } from '../store/contentStore'
import toast from 'react-hot-toast'

const CATEGORIES: { label: QuizCategory; color: string; bg: string }[] = [
  { label: 'School', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { label: 'JEE', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { label: 'NEET', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  { label: 'Aptitude', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { label: 'DSA', color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
  { label: 'Programming', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
]

const DIFF_COLORS = { Easy: 'text-green-500 bg-green-50 dark:bg-green-900/20', Medium: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', Hard: 'text-red-500 bg-red-50 dark:bg-red-900/20' }

// ─── Quiz Runner ──────────────────────────────────────────────────────────────
function QuizRunner({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(quiz.questions.length).fill(null))
  const [showResult, setShowResult] = useState(false)
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60)
  const [started, setStarted] = useState(false)

  // Timer
  useState(() => {
    if (!started) return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0) { clearInterval(timer); setShowResult(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  })

  const handleStart = () => setStarted(true)

  const handleAnswer = (idx: number) => {
    if (answers[current] !== null) return
    setSelected(idx)
    const newAns = [...answers]
    newAns[current] = idx
    setAnswers(newAns)
  }

  const handleNext = () => {
    if (current < quiz.questions.length - 1) {
      setCurrent(c => c + 1)
      setSelected(null)
    } else {
      setShowResult(true)
    }
  }

  const score = answers.reduce((acc, ans, i) => ans === quiz.questions[i]?.correctIndex ? acc + 1 : acc, 0)
  const pct = Math.round((score / quiz.questions.length) * 100)
  const mm = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const ss = (timeLeft % 60).toString().padStart(2, '0')
  const q = quiz.questions[current]

  if (!started) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle size={32} className="text-primary-500" />
            </div>
            <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-2">{quiz.title}</h2>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-6">{quiz.description}</p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                <div className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{quiz.questions.length}</div>
                <div className="text-[11px] text-brand-muted">Questions</div>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                <div className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{quiz.timeLimit}m</div>
                <div className="text-[11px] text-brand-muted">Time Limit</div>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                <div className="text-lg font-bold text-brand-text dark:text-brand-dark-text">{quiz.maxScore}</div>
                <div className="text-[11px] text-brand-muted">Max Score</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
              <button onClick={handleStart} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600">Start Quiz</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  if (showResult) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${pct >= 70 ? 'bg-green-100 dark:bg-green-900/30' : pct >= 40 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <span className={`text-3xl font-bold ${pct >= 70 ? 'text-green-500' : pct >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</span>
          </div>
          <h2 className="text-xl font-bold text-brand-text dark:text-brand-dark-text mb-1">
            {pct >= 70 ? '🎉 Excellent!' : pct >= 40 ? '👍 Good Effort!' : '📚 Keep Practicing!'}
          </h2>
          <p className="text-brand-muted dark:text-brand-dark-muted text-sm mb-6">
            You scored {score} out of {quiz.questions.length} questions correctly.
          </p>
          {pct >= 70 && (
            <div className="flex items-center gap-2 justify-center bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-6">
              <Award size={20} className="text-amber-500" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Certificate Earned! Score: {pct}/100</span>
            </div>
          )}
          {/* Answer Review */}
          <div className="text-left space-y-2 max-h-48 overflow-y-auto mb-6">
            {quiz.questions.map((qq, i) => (
              <div key={qq.id} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${answers[i] === qq.correctIndex ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
                {answers[i] === qq.correctIndex ? <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" /> : <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" />}
                <div>
                  <p className="font-medium text-brand-text dark:text-brand-dark-text">{qq.question}</p>
                  {answers[i] !== qq.correctIndex && <p className="text-green-600 dark:text-green-400">Correct: {qq.options[qq.correctIndex]}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm font-semibold text-brand-text dark:text-brand-dark-text">Done</button>
            <button onClick={() => { setAnswers(new Array(quiz.questions.length).fill(null)); setCurrent(0); setSelected(null); setShowResult(false); setTimeLeft(quiz.timeLimit * 60) }} className="flex-1 py-3 bg-primary-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-brand-muted dark:text-brand-dark-muted">Question {current + 1} of {quiz.questions.length}</p>
            <div className="w-48 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full mt-1">
              <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${((current + 1) / quiz.questions.length) * 100}%` }} />
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold ${timeLeft < 60 ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-gray-50 dark:bg-white/5 text-brand-text dark:text-brand-dark-text'}`}>
            <Clock size={14} /> {mm}:{ss}
          </div>
        </div>

        {/* Question */}
        <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text mb-5 leading-relaxed">{q.question}</h3>

        {/* Options */}
        <div className="space-y-2 mb-6">
          {q.options.map((opt, i) => {
            const isSelected = selected === i || answers[current] === i
            const isCorrect = answers[current] !== null && i === q.correctIndex
            const isWrong = answers[current] !== null && isSelected && i !== q.correctIndex
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={answers[current] !== null}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : isWrong ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : isSelected && answers[current] === null ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-brand-border dark:border-brand-dark-border hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 text-brand-text dark:text-brand-dark-text'
                }`}
              >
                <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {answers[current] !== null && q.explanation && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-0.5">Explanation</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">{q.explanation}</p>
          </motion.div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2.5 border border-brand-border dark:border-brand-dark-border rounded-xl text-sm text-brand-muted">Exit</button>
          <button
            onClick={handleNext}
            disabled={answers[current] === null}
            className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {current < quiz.questions.length - 1 ? (<>Next <ChevronRight size={15} /></>) : 'Finish Quiz 🎯'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Quizzes() {
  const { quizzes } = useContentStore()
  const [activeCategory, setActiveCategory] = useState<QuizCategory | null>(null)
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)

  const published = quizzes.filter(q => q.status === 'Published')
  const filtered = activeCategory ? published.filter(q => q.category === activeCategory) : published

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg pt-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0F0F1A] via-[#180F35] to-[#0F0F1A] py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-purple-400 bg-purple-400/10 border border-purple-400/30 rounded-full mb-4 uppercase tracking-widest">
              <Trophy size={13} /> Quiz & Test Platform
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Test Your <span className="gradient-text">Knowledge</span>
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto">
              Practice with {published.length}+ curated quizzes. Get instant feedback, leaderboards, and earn certificates.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-8">
            {[
              { val: published.length + '+', label: 'Quizzes' },
              { val: (published.reduce((a, q) => a + q.participants, 0) / 1000).toFixed(0) + 'K+', label: 'Participants' },
              { val: '100%', label: 'Free Access' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-white">{s.val}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!activeCategory ? 'bg-primary-500 text-white' : 'bg-white dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border text-brand-muted dark:text-brand-dark-muted hover:border-primary-500'}`}
          >
            All ({published.length})
          </button>
          {CATEGORIES.map(cat => {
            const cnt = published.filter(q => q.category === cat.label).length
            return (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeCategory === cat.label ? 'bg-primary-500 text-white' : `${cat.bg} ${cat.color} border border-transparent`}`}
              >
                {cat.label} ({cnt})
              </button>
            )
          })}
        </div>

        {/* Quiz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map(quiz => (
              <motion.div
                key={quiz.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                whileHover={{ y: -3 }}
                className="card p-6 cursor-pointer group"
                onClick={() => setActiveQuiz(quiz)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center">
                    <HelpCircle size={22} className="text-primary-500" />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${DIFF_COLORS[quiz.difficulty]}`}>
                    {quiz.difficulty}
                  </span>
                </div>
                <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text mb-1 group-hover:text-primary-500 transition-colors">
                  {quiz.title}
                </h3>
                <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-4 line-clamp-2">
                  {quiz.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-brand-muted dark:text-brand-dark-muted mb-4">
                  <span className="flex items-center gap-1"><HelpCircle size={11} />{quiz.questions.length} Questions</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{quiz.timeLimit} min</span>
                  <span className="flex items-center gap-1"><Users size={11} />{quiz.participants.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORIES.find(c => c.label === quiz.category)?.bg || ''} ${CATEGORIES.find(c => c.label === quiz.category)?.color || ''}`}>
                    {quiz.category}
                  </span>
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-semibold hover:bg-primary-600 transition-colors">
                    Start Quiz <ChevronRight size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <HelpCircle size={48} className="mx-auto text-brand-muted opacity-30 mb-4" />
            <h3 className="text-lg font-semibold text-brand-text dark:text-brand-dark-text">No quizzes available</h3>
          </div>
        )}
      </div>

      {/* Quiz Runner Modal */}
      <AnimatePresence>
        {activeQuiz && <QuizRunner quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}
      </AnimatePresence>
    </div>
  )
}
