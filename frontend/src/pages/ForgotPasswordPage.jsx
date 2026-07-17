import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { HiCloud, HiKey, HiMail, HiEye, HiEyeOff, HiArrowLeft, HiCheckCircle, HiXCircle } from 'react-icons/hi'
import { toast } from 'react-toastify'

/* ── Password Rules ── */
const HAS_UPPERCASE = /[A-Z]/
const HAS_SPECIAL   = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/

function getPasswordRules(password) {
  return [
    { label: 'At least 8 characters',         met: password.length >= 8 },
    { label: 'At least one uppercase letter',  met: HAS_UPPERCASE.test(password) },
    { label: 'At least one special character', met: HAS_SPECIAL.test(password) },
  ]
}

/* ── Step Indicator ── */
function StepIndicator({ current }) {
  const steps = [
    { num: 1, label: 'Email' },
    { num: 2, label: 'Verify OTP' },
    { num: 3, label: 'New Password' },
  ]
  return (
    <div className="flex items-center justify-center gap-0 mb-7">
      {steps.map((s, i) => (
        <React.Fragment key={s.num}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
              current > s.num
                ? 'bg-green-500 border-green-500 text-white'
                : current === s.num
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-transparent border-white/20 text-slate-500'
            }`}>
              {current > s.num ? '✓' : s.num}
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${current >= s.num ? 'text-slate-300' : 'text-slate-600'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-10 mb-4 mx-1 transition-all ${current > s.num ? 'bg-green-500' : 'bg-white/10'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function ForgotPasswordPage() {
  const navigate  = useNavigate()
  const [step, setStep]            = useState(1)
  const [email, setEmail]          = useState('')
  const [otp, setOtp]              = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]      = useState(false)
  const [showPwd, setShowPwd]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const inputRefs = useRef([])

  const rules       = getPasswordRules(newPassword)
  const allRulesMet = rules.every(r => r.met)
  const otpString   = otp.join('')

  /* ── Step 1: Send OTP ── */
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      toast.success('OTP code sent to your email!')
      setStep(2)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP. Please check your email.')
    } finally {
      setLoading(false)
    }
  }

  /* ── OTP Box handlers ── */
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = [...otp]
    pasted.split('').forEach((char, i) => { newOtp[i] = char })
    setOtp(newOtp)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (otpString.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP code')
      return
    }
    toast.success('OTP verified! Set your new password.')
    setStep(3)
  }

  /* ── Step 3: Reset Password ── */
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!allRulesMet) {
      toast.error('Password does not meet all requirements')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword({ email, otp: otpString, newPassword })
      toast.success('Password changed successfully! Please login.')
      navigate('/login')
    } catch (err) {
      const msg = err?.response?.data?.message || ''
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
        toast.error('Invalid or expired OTP. Please start over.')
        setStep(1)
        setOtp(['', '', '', '', '', ''])
      } else {
        toast.error(msg || 'Reset failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 text-sm transition-all"
  const btnClass   = "w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/10 active:scale-[0.98] transition-all disabled:opacity-50"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-950 to-purple-950 p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-purple-600/20 mb-3.5">
            <HiCloud className="text-3xl text-white animate-pulse" />
          </div>
          <span className="text-3xl font-black tracking-tight text-white">SmartCloud AI</span>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Intelligent File Hub</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-5 font-bold uppercase tracking-wider">
            <HiArrowLeft /> Back to login
          </Link>

          <StepIndicator current={step} />

          {/* ── STEP 1: Email ── */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-1">
                <HiMail className="text-purple-400" /> Forgot Password?
              </h1>
              <p className="text-slate-400 text-xs mb-6">
                Enter your registered email — we'll send a 6-digit OTP to reset your password.
              </p>
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value.toLowerCase())}
                    className={inputClass}
                  />
                </div>
                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? 'Sending OTP...' : 'Send OTP Code →'}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2: OTP Verify ── */}
          {step === 2 && (
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-1">
                <HiKey className="text-purple-400" /> Enter OTP Code
              </h1>
              <p className="text-slate-400 text-xs mb-2">
                A 6-digit code was sent to <strong className="text-purple-300">{email}</strong>
              </p>
              <p className="text-slate-500 text-[10px] mb-6 uppercase tracking-wider">Check your inbox (or spam folder)</p>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* OTP Boxes */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
                    Enter the 6-digit code
                  </label>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => inputRefs.current[index] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(index, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(index, e)}
                        className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 bg-slate-950/60 text-white outline-none transition-all duration-200 ${
                          digit
                            ? 'border-purple-500 shadow-md shadow-purple-500/20 text-purple-300'
                            : 'border-white/15 text-slate-400'
                        } focus:border-purple-400 focus:shadow-purple-400/30`}
                      />
                    ))}
                  </div>
                  {otpString.length === 6 && (
                    <p className="text-center text-green-400 text-xs font-bold mt-3">✓ Code complete — click Verify</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={otpString.length !== 6}
                  className={btnClass}
                >
                  Verify OTP →
                </button>

                <p className="text-center text-xs text-slate-500">
                  Didn't receive?{' '}
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-purple-400 hover:text-purple-300 font-bold hover:underline"
                  >
                    Resend OTP
                  </button>
                </p>
              </form>
            </div>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === 3 && (
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-1">
                <HiCheckCircle className="text-green-400" /> Set New Password
              </h1>
              <p className="text-slate-400 text-xs mb-6">
                OTP verified ✅ — Enter your new password below.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Hidden username input for browser password manager */}
                <input
                  type="email"
                  name="username"
                  value={email}
                  readOnly
                  autoComplete="username"
                  style={{ display: 'none' }}
                />

                {/* New Password */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className={`${inputClass} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-lg transition-colors">
                      {showPwd ? <HiEyeOff /> : <HiEye />}
                    </button>
                  </div>

                  {/* Password Rules */}
                  {newPassword.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {rules.map(rule => (
                        <li key={rule.label} className="flex items-center gap-1.5 text-xs">
                          {rule.met
                            ? <HiCheckCircle className="text-green-500 shrink-0" />
                            : <HiXCircle className="text-red-400 shrink-0" />
                          }
                          <span className={rule.met ? 'text-green-400' : 'text-slate-500'}>{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`${inputClass} pr-10 ${
                        confirmPassword && newPassword !== confirmPassword ? 'border-red-500/50' : ''
                      } ${
                        confirmPassword && newPassword === confirmPassword ? 'border-green-500/50' : ''
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-lg transition-colors">
                      {showConfirm ? <HiEyeOff /> : <HiEye />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && allRulesMet && (
                    <p className="text-xs text-green-400 mt-1">✓ Passwords match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !allRulesMet || newPassword !== confirmPassword}
                  className={btnClass}
                >
                  {loading ? 'Changing Password...' : 'Change Password ✓'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
