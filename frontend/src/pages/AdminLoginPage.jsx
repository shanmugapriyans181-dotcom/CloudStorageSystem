import React, { useState } from 'react'
import { useAdminAuthStore } from '../store/adminAuthStore'
import { HiShieldCheck, HiEye, HiEyeOff } from 'react-icons/hi'
import { toast } from 'react-toastify'

import { useThemeStore } from '../store/themeStore'

export default function AdminLoginPage() {
  const { adminLogin } = useAdminAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminLogin(email, password)
      useThemeStore.setState({ darkMode: false })
      toast.success('Admin authenticated successfully!')
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Invalid Admin Credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        <div className="flex flex-col items-center mb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-600/20 mb-3.5">
            <HiShieldCheck className="text-3xl text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white uppercase">Cloud Portal Admin</span>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Secure Gateway Control</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-lg font-bold text-slate-100">Sign In to Console</h1>
          <p className="text-slate-500 text-xs mt-1 mb-6">Enter administrative credentials below.</p>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Fake inputs to prevent aggressive Chrome autofill */}
            <input style={{ display: 'none' }} type="text" name="fakeusername" />
            <input style={{ display: 'none' }} type="password" name="fakepassword" />

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#070a0e] text-slate-200 focus:outline-none focus:border-blue-500/50 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#070a0e] text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500/50 text-sm transition-all pr-10"
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
              className="w-full py-3 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Authorizing Console...' : 'Login Portal'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
