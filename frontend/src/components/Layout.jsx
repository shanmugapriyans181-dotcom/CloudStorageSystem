import { Outlet, NavLink } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import UploadModal from './UploadModal'
import { useState, useEffect } from 'react'
import { HiHome, HiFolder, HiShare, HiSparkles } from 'react-icons/hi'
import clsx from 'clsx'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6 animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation Bar for Mobile Devices */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => clsx(
            "flex flex-col items-center justify-center text-[10px] font-bold transition-colors w-12 h-12",
            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <HiHome className="text-lg" />
          <span>Home</span>
        </NavLink>
        
        <NavLink
          to="/files"
          className={({ isActive }) => clsx(
            "flex flex-col items-center justify-center text-[10px] font-bold transition-colors w-12 h-12",
            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <HiFolder className="text-lg" />
          <span>Files</span>
        </NavLink>

        {/* Dynamic Plus FAB Button */}
        <div className="relative -top-4">
          <button
            onClick={() => setShowUpload(true)}
            className="w-12 h-12 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 dark:shadow-indigo-500/20 active:scale-95 transition-transform hover:bg-indigo-500"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <NavLink
          to="/shared"
          className={({ isActive }) => clsx(
            "flex flex-col items-center justify-center text-[10px] font-bold transition-colors w-12 h-12",
            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <HiShare className="text-lg" />
          <span>Shared</span>
        </NavLink>

        <NavLink
          to="/ipo-summary"
          className={({ isActive }) => clsx(
            "flex flex-col items-center justify-center text-[10px] font-bold transition-colors w-12 h-12",
            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
          )}
        >
          <HiSparkles className="text-lg" />
          <span>AI Hub</span>
        </NavLink>
      </div>

      {/* Upload Modal (accessible on mobile click) */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  )
}
