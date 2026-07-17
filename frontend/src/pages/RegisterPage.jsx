import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { HiCloud, HiEye, HiEyeOff, HiCheckCircle, HiXCircle } from 'react-icons/hi'
import { toast } from 'react-toastify'

/* ── Validation helpers ───────────────────────────────────────── */
const EMAIL_REGEX = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/
const HAS_UPPERCASE = /[A-Z]/
const HAS_SPECIAL   = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
const MIN_LENGTH    = 8

function getPasswordRules(password) {
  return [
    { label: 'At least 8 characters',          met: password.length >= MIN_LENGTH },
    { label: 'At least one uppercase letter',   met: HAS_UPPERCASE.test(password) },
    { label: 'At least one special character',  met: HAS_SPECIAL.test(password) },
  ]
}

function getStrength(rules) {
  const count = rules.filter(r => r.met).length
  if (count === 0) return { label: '', color: '' }
  if (count === 1) return { label: 'Weak',   color: '#ef4444' }
  if (count === 2) return { label: 'Medium', color: '#f59e0b' }
  return               { label: 'Strong', color: '#22c55e' }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ username: '', email: '', password: '', fullName: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })

  /* Auto-lowercase email as user types */
  const handleEmailChange = (e) =>
    setForm({ ...form, email: e.target.value.toLowerCase() })

  const rules    = getPasswordRules(form.password)
  const strength = getStrength(rules)
  const allRulesMet = rules.every(r => r.met)

  const isEmailValid = EMAIL_REGEX.test(form.email)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ email: true, password: true })

    /* ── Frontend validation ── */
    if (!isEmailValid) {
      toast.error('Please enter a valid lowercase email address')
      return
    }
    if (!allRulesMet) {
      toast.error('Password does not meet all requirements')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/register', {
        username: form.username,
        email:    form.email,          // already lowercase
        password: form.password,
        fullName: form.fullName,
      })
      toast.success('Account created successfully! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <HiCloud className="text-4xl text-primary-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">CloudStorage</span>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create account</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Get 5 GB of free storage</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                autoComplete="name-field-off"
                placeholder="John Doe"
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                className="input-field"
              />
            </div>

             {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input
                type="text"
                required
                name="username"
                autoComplete="username"
                placeholder="johndoe"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="input-field"
              />
            </div>

            {/* Email — auto lowercase */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                required
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleEmailChange}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                className={`input-field ${touched.email && !isEmailValid && form.email ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {touched.email && form.email && !isEmailValid && (
                <p className="text-xs text-red-500 mt-1">Enter a valid email (e.g. user@example.com)</p>
              )}
              {form.email && isEmailValid && (
                <p className="text-xs text-green-500 mt-1">✓ Looks good</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <HiEyeOff /> : <HiEye />}
                </button>
              </div>

              {/* Strength bar */}
              {form.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {rules.map((_, i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: i < rules.filter(r => r.met).length ? strength.color : '#e5e7eb' }}
                      />
                    ))}
                  </div>
                  {strength.label && (
                    <p className="text-xs font-medium" style={{ color: strength.color }}>
                      {strength.label} password
                    </p>
                  )}
                </div>
              )}

              {/* Rule checklist */}
              {(form.password.length > 0 || touched.password) && (
                <ul className="mt-2 space-y-1">
                  {rules.map(rule => (
                    <li key={rule.label} className="flex items-center gap-1.5 text-xs">
                      {rule.met
                        ? <HiCheckCircle className="text-green-500 shrink-0" />
                        : <HiXCircle    className="text-red-400 shrink-0" />
                      }
                      <span className={rule.met ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                        {rule.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
