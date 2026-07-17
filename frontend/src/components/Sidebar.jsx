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

export default function Sidebar({ open }) {
  const { user } = useAuthStore()

  return (
    <aside className={clsx(
      'flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200',
      'dark:border-gray-800 transition-all duration-300 shrink-0',
      open ? 'w-64' : 'w-0 overflow-hidden'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <HiCloud className="text-primary-600 text-2xl" />
        <span className="font-bold text-lg text-gray-900 dark:text-white">CloudStorage</span>
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
  )
}
