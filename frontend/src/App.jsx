import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAdminAuthStore } from './store/adminAuthStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import AdminLoginPage from './pages/AdminLoginPage'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import FilesPage from './pages/FilesPage'
import TrashPage from './pages/TrashPage'
import SharedPage from './pages/SharedPage'
import SearchPage from './pages/SearchPage'
import ProfilePage from './pages/ProfilePage'
import PublicSharePage from './pages/PublicSharePage'
import UpgradePage from './pages/UpgradePage'
import AdminDashboard from './pages/AdminDashboard'
import IpoSummaryPage from './pages/IpoSummaryPage'
import { useEffect, useState } from 'react'
import { useThemeStore } from './store/themeStore'
import axios from 'axios'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AdminRoute() {
  const { isAdminAuthenticated } = useAdminAuthStore()
  return isAdminAuthenticated ? <AdminDashboard /> : <AdminLoginPage />
}

/** Sends a heartbeat to backend every 60s to keep isOnline = true */
function useHeartbeat() {
  const { isAuthenticated, accessToken } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    const ping = () => {
      axios.post('/api/auth/heartbeat', {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }).catch(() => {})
    }

    ping() // immediate ping on mount
    const id = setInterval(ping, 60000)
    return () => clearInterval(id)
  }, [isAuthenticated, accessToken])
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      // Double check internet access with a quick head request to API
      fetch('/api/users/me', { method: 'HEAD' })
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false))
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(() => {
      if (navigator.onLine) {
        fetch('/api/users/me', { method: 'HEAD' })
          .then(() => setIsOnline(true))
          .catch(() => setIsOnline(false))
      } else {
        setIsOnline(false)
      }
    }, 10000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return isOnline
}

function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans selection:bg-purple-500/30">
      <div className="max-w-md w-full space-y-8 bg-slate-900/50 backdrop-blur-xl border border-white/15 p-8 rounded-3xl shadow-2xl text-left relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="flex justify-center mb-6">
          <div className="relative group cursor-pointer">
            {/* Styled Dinosaur pixel SVG */}
            <svg
              className="w-24 h-24 text-slate-400 group-hover:text-purple-400 transition-all duration-300 transform group-hover:scale-105"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              strokeWidth="1.5"
            >
              {/* Chrome-like Dinosaur SVG path */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>No internet connection</span>
          </h1>

          <div className="text-sm text-slate-450 space-y-3 font-semibold leading-relaxed">
            <p>Try:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Checking the network cables, modem, and router</li>
              <li>Reconnecting to Wi-Fi</li>
              <li>Running Windows Network Diagnostics</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
          <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
            ERR_INTERNET_DISCONNECTED
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white shadow-lg transition-all duration-200"
          >
            Try Reconnecting
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { darkMode } = useThemeStore()
  const isOnline = useOnlineStatus()
  useHeartbeat()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  if (!isOnline) {
    return <OfflinePage />
  }

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/shared/:token" element={<PublicSharePage />} />
      <Route path="/admin" element={<AdminRoute />} />

      {/* Pathless Layout for Private Pages */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/files/folder/:folderId" element={<FilesPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/shared" element={<SharedPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/upgrade" element={<UpgradePage />} />
        <Route path="/ipo-summary" element={<IpoSummaryPage />} />
      </Route>
    </Routes>
  )
}
