import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { HiCloud, HiEye, HiEyeOff } from 'react-icons/hi'
import { FaGoogle } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { authApi } from '../services/api'
import api from '../services/api'
import { useThemeStore } from '../store/themeStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [googleClientId, setGoogleClientId] = useState('')
  const [gsiLoaded, setGsiLoaded] = useState(false)

  // 1. Fetch Google Client ID from backend configurations on load
  useEffect(() => {
    authApi.getGoogleClientId()
      .then(res => {
        if (res.data.success && res.data.data.googleClientId) {
          setGoogleClientId(res.data.data.googleClientId)
        }
      })
      .catch(err => {
        console.warn('Could not retrieve Google Client ID from backend config', err)
      })
  }, [])

  // 2. Load Google Identity Services SDK script dynamically
  useEffect(() => {
    if (!googleClientId) return

    const loadGsiScript = () => {
      if (window.google?.accounts?.id) {
        setGsiLoaded(true)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => setGsiLoaded(true)
      script.onerror = () => toast.error('Failed to load Google Sign-In SDK')
      document.body.appendChild(script)
    }

    loadGsiScript()
  }, [googleClientId])

  // 3. Initialize Google login button once client-id and SDK script are ready
  useEffect(() => {
    if (googleClientId && gsiLoaded && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        })

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { 
            type: 'standard',
            theme: 'filled_blue', 
            size: 'large', 
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: '360'
          }
        )
      } catch (err) {
        console.error('Error initializing Google Sign-In button', err)
      }
    }
  }, [googleClientId, gsiLoaded])

  // 4. Handle authentic Google ID Token response and verify it with Spring backend
  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true)
    try {
      const res = await authApi.googleLogin(response.credential)
      if (res.data.success) {
        const { accessToken, refreshToken, user } = res.data.data
        
        // Populate system credentials into Zustand store state
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        useAuthStore.setState({ user, accessToken, refreshToken, isAuthenticated: true })
        useThemeStore.setState({ darkMode: false })
        
        toast.success(`Successfully signed in as ${user.fullName || user.username}`)
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Google verification failed. Access Denied.')
    } finally {
      setLoading(false)
    }
  }

  const [usernameFocused, setUsernameFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { login } = useAuthStore.getState()
      await login(form.usernameOrEmail, form.password)
      useThemeStore.setState({ darkMode: false })
      toast.success('Signed in successfully!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-950 to-purple-950 p-6 relative overflow-hidden">
      {/* Dynamic background lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        <div className="flex flex-col items-center mb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-purple-600/20 mb-3.5">
            <HiCloud className="text-3xl text-white animate-pulse" />
          </div>
          <span className="text-3xl font-black tracking-tight text-white">SmartCloud AI</span>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Intelligent File Hub</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-xl font-bold text-slate-100">Welcome Back</h1>
          <p className="text-slate-400 text-xs mt-1 mb-6">Sign in to manage your intelligent documents.</p>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Email or Username
              </label>
              <input
                type="text"
                required
                name="username"
                autoComplete="new-username"
                placeholder="you@example.com"
                value={form.usernameOrEmail}
                onChange={e => setForm({ ...form, usernameOrEmail: e.target.value })}
                readOnly={!usernameFocused}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 text-sm transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: '10px' }} className="text-purple-400 hover:text-purple-300 font-bold hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  name="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  readOnly={!passwordFocused}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 text-sm transition-all pr-10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-lg transition-colors"
                >
                  {showPwd ? <HiEyeOff /> : <HiEye />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Social login division */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-white/5" />
            <span className="absolute bg-slate-900/90 px-3 text-[10px] text-slate-400 uppercase tracking-widest font-bold">or continue with</span>
          </div>

          <div className="flex justify-center w-full">
            {googleClientId ? (
              <div className="w-full flex justify-center overflow-hidden">
                <div id="google-signin-btn" />
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => {
                  toast.warning(
                    'Google Login requires client configuration. Add your GOOGLE_CLIENT_ID variable in application.yml or your environment settings.',
                    { autoClose: 6000 }
                  )
                }}
                className="w-full py-3 border border-dashed border-white/20 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <FaGoogle className="text-sm text-red-500/50" /> Configure Google Login
              </button>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-400 font-bold hover:underline hover:text-purple-300">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
