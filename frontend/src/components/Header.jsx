import { HiMenu, HiSearch, HiSun, HiMoon, HiStar, HiChevronDown } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useState } from 'react'
import NotificationCenter from './NotificationCenter'

export default function Header({ onMenuClick }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { darkMode, toggleDarkMode } = useThemeStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800
                       flex items-center px-4 gap-4 shrink-0">
      {/* Menu button */}
      <button onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <HiMenu className="text-xl text-gray-600 dark:text-gray-400" />
      </button>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-lg">
        <div className="relative">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 py-2 text-sm"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {/* Upgrade Plan button */}
        <button
          onClick={() => navigate('/upgrade')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 hover:border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-all duration-300 font-semibold text-xs md:text-sm shrink-0"
        >
          <HiStar className="text-sm text-yellow-500 fill-yellow-500 animate-pulse" />
          <span>Upgrade Plan</span>
          <HiChevronDown className="text-xs text-purple-500" />
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {darkMode
            ? <HiSun className="text-xl text-yellow-400" />
            : <HiMoon className="text-xl text-gray-600" />}
        </button>

        {/* Notification center bell */}
        <NotificationCenter />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center
                            text-white font-semibold text-sm overflow-hidden border border-gray-200 dark:border-gray-800">
              {user?.profilePicture && user.profilePicture !== 'null' && user.profilePicture.trim() !== '' ? (
                <img
                  src={
                    user.profilePicture.startsWith('http://') || user.profilePicture.startsWith('https://')
                      ? user.profilePicture
                      : `/api/users/profile-picture/view/${user.profilePicture}`
                  }
                  alt="avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.className = 'hidden';
                  }}
                />
              ) : (
                user?.username?.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-sm font-medium hidden sm:block dark:text-gray-200">
              {user?.username}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl
                            shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              <button
                onClick={() => { navigate('/profile'); setDropdownOpen(false) }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700
                           text-gray-700 dark:text-gray-300"
              >
                Profile Settings
              </button>
              <hr className="border-gray-100 dark:border-gray-700 my-1" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50
                           dark:hover:bg-red-900/20"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
