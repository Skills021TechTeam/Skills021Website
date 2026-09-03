import { Link } from 'react-router-dom'
import { Play, Globe, Link2, Mail, BookOpen, FileText, HelpCircle, Cookie, ShieldCheck } from 'lucide-react'
import { openCookieSettings } from '../lib/cookieService'
import Logo from './Logo'

const footerLinks = [

  {
    title: 'Courses',
    links: [
      { label: 'DSA & Algorithms', to: '/courses?group=College+%26+Tech+Courses&sub=DSA' },
      { label: 'Web Development', to: '/courses?group=College+%26+Tech+Courses&sub=Web+Development' },
      { label: 'JEE Preparation', to: '/courses?group=Competitive+Exams&sub=JEE+Preparation' },
      { label: 'NEET Preparation', to: '/courses?group=Competitive+Exams&sub=NEET+Preparation' },
      { label: 'AI & ML', to: '/courses?group=College+%26+Tech+Courses&sub=AI+%26+Machine+Learning' },
      { label: 'Class 9-10', to: '/courses?group=Foundation+Programs&sub=Class+9-10' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Notes & PDFs', to: '/resources?type=Notes' },
      { label: 'Roadmaps', to: '/roadmaps' },
      { label: 'Previous Year Papers', to: '/resources?type=Previous+Year+Papers' },
      { label: 'Quizzes & Tests', to: '/quizzes' },
      { label: 'Cheat Sheets', to: '/resources?type=Cheat+Sheets' },
      { label: 'Interview Questions', to: '/resources?type=Interview+Questions' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Logo size="md" showTagline={true} className="mb-5" />
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              India's premier EdTech platform with quality courses, study resources, and expert mentorship for students across India.
            </p>
            {/* Quick nav pills */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {[
                { icon: BookOpen, label: 'Courses', to: '/courses' },
                { icon: FileText, label: 'Resources', to: '/resources' },
                { icon: HelpCircle, label: 'Quizzes', to: '/quizzes' },
              ].map(item => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] text-gray-400 hover:text-white transition-colors"
                >
                  <item.icon size={11} /> {item.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <a href="https://www.youtube.com/@skills021" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors" aria-label="YouTube">
                <Play size={15} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors" aria-label="GitHub">
                <Globe size={15} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors" aria-label="LinkedIn">
                <Link2 size={15} />
              </a>
              <a href="mailto:contact@skill021.com" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors" aria-label="Email">
                <Mail size={15} />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map(col => (
            <div key={col.title}>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Privacy & Experience column */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Privacy & Experience</h3>
            <ul className="space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-200 text-left"
                >
                  <Cookie size={14} className="text-gray-400" />
                  Cookie Settings
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-200 text-left"
                >
                  <ShieldCheck size={14} className="text-gray-400" />
                  Cookie Policy
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2025 Skill021. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-gray-500">
            <span>🇮🇳 India</span>
            <button
              type="button"
              onClick={openCookieSettings}
              className="hover:text-white transition-colors flex items-center gap-1 text-gray-400"
            >
              <Cookie size={12} className="text-gray-400" /> Cookie Preferences
            </button>
            <a href="https://www.youtube.com/@skills021" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube Channel</a>
            <span>100% Dynamic Platform</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
