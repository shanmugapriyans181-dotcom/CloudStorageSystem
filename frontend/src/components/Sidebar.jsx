import { NavLink } from 'react-router-dom'
import {
  HiHome, HiFolder, HiTrash, HiShare, HiSearch,
  HiCog, HiCloud, HiShieldCheck, HiSparkles
} from 'react-icons/hi'
import { useAuthStore } from '../store/authStore'
import StorageBar from './StorageBar'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: HiHome,       label: 'Dashboard' },
  { to: '/files',     icon: HiFolder,     label: 'My Files' },
  { to: '/ipo-summary',icon: HiSparkles,   label: 'IPO Analyzer' },
  { to: '/shared',    icon: HiShare,      label: 'Shared' },
  { to: '/search',    icon: HiSearch,     label: 'Search' },
  { to: '/trash',     icon: HiTrash,      label: 'Trash' },
]

export default function Sidebar({ open, onClose }) {
  const { user } = useAuthStore()

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <button
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 cursor-default"
        />
      )}

      <aside className={clsx(
        'flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 shrink-0',
        // Desktop styling
        'md:relative md:translate-x-0',
        open ? 'md:w-64' : 'md:w-0 md:overflow-hidden',
        // Mobile styling
        'fixed inset-y-0 left-0 z-50 w-64 transform',
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      )}>
        {/* Logo & Mobile Close */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <HiCloud className="text-primary-600 text-2xl" />
            <span className="font-bold text-lg text-gray-900 dark:text-white">CloudStorage</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}
          >
            <Icon className="text-lg shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Storage Bar */}
      <div className="px-4 pb-4">
        <StorageBar />
      </div>
    </aside>
    </>
  )
}
