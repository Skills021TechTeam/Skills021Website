import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, BookOpen, FileText, Compass, UserCircle2, Shield } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function MobileBottomNav() {
  const location = useLocation()
  const { isAuthenticated, user, isAdminAuthenticated } = useAuthStore()

  // Hide bottom nav on admin portal, admin login, or embedded view
  if (location.pathname.startsWith('/admin')) {
    return null
  }

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      path: '/',
      icon: Home,
      isActive: location.pathname === '/',
    },
    {
      id: 'courses',
      label: 'Courses',
      path: '/courses',
      icon: BookOpen,
      isActive: location.pathname.startsWith('/courses'),
    },
    {
      id: 'resources',
      label: 'Notes',
      path: '/resources',
      icon: FileText,
      isActive: location.pathname.startsWith('/resources'),
    },
    {
      id: 'pathfinder',
      label: 'Careers',
      path: '/pathfinder',
      icon: Compass,
      isActive: location.pathname.startsWith('/pathfinder'),
    },
    {
      id: 'account',
      label: isAdminAuthenticated ? 'Admin' : isAuthenticated ? 'Dashboard' : 'Account',
      path: isAdminAuthenticated ? '/admin' : isAuthenticated ? '/dashboard' : '/login',
      icon: isAdminAuthenticated ? Shield : UserCircle2,
      isActive: location.pathname === '/dashboard' || location.pathname === '/login' || location.pathname === '/register',
    },
  ]

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-gray-200/80 dark:border-zinc-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] safe-bottom"
    >
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.isActive

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition-all duration-200 select-none ${
                active
                  ? 'text-primary-600 dark:text-primary-400 font-bold'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="mobile-bottom-nav-active-pill"
                  className="absolute -top-1.5 w-8 h-1 bg-primary-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <div
                className={`p-1 rounded-xl transition-colors ${
                  active ? 'bg-primary-500/10 dark:bg-primary-400/10' : ''
                }`}
              >
                <Icon size={20} className={active ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
