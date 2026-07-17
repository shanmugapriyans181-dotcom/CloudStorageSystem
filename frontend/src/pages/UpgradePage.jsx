import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import {
  HiCheckCircle, HiLightningBolt, HiStar, HiShieldCheck,
  HiArrowLeft, HiLockClosed, HiDatabase, HiX,
  HiDeviceMobile, HiCheck, HiQrcode, HiOutlineUpload
} from 'react-icons/hi'
import axios from 'axios'

/* ─────────────── Premium UPI Verification Modal ─────────────── */
function PaymentModal({ plan, onClose, onSuccess }) {
  const { user } = useAuthStore()
  const [adminSettings, setAdminSettings] = useState(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [userName, setUserName] = useState(user?.fullName || user?.username || '')
  const [userEmail, setUserEmail] = useState(user?.email || '')
  const [userUpi, setUserUpi] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch admin UPI configuration
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const headers = { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
        const res = await axios.get('/api/payment/settings', { headers })
        if (res.data.success) {
          setAdminSettings(res.data.data)
        }
      } catch (err) {
        toast.error('Failed to load payment credentials.')
      } finally {
        setLoadingSettings(false)
      }
    }
    fetchSettings()
  }, [])

  const handlePay = async () => {
    if (!userName.trim()) {
      toast.error('Please enter your name.')
      return
    }
    if (!userEmail.trim()) {
      toast.error('Please enter your email.')
      return
    }
    if (!userUpi.trim()) {
      toast.error('Please enter your UPI ID.')
      return
    }

    setSubmitting(true)
    try {
      const headers = { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
      
      // Auto-generate unique transaction reference ID for the payment ledger
      const generatedRef = 'UTR-' + Date.now() + Math.floor(Math.random() * 1000)
      
      const payload = {
        planName: plan.id,
        amount: plan.priceValue,
        upiId: userUpi.trim(),
        transactionReference: generatedRef,
        screenshotUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      }

      const res = await axios.post('/api/payment/submit', payload, { headers })
      if (res.data.success) {
        toast.success(res.data.message || 'Upgrade successful!')
        onSuccess()
      } else {
        toast.error(res.data.message || 'Payment submission failed.')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Transaction submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const defaultUpi = adminSettings?.upiId || 'smartcloud@upi'
  const payeeName = adminSettings?.adminName || 'SmartCloud AI'
  const upiLink = `upi://pay?pa=${defaultUpi}&pn=${encodeURIComponent(payeeName)}&am=${plan.priceValue}&cu=INR`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070b]/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0d111b] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-black text-base">UPI Checkout</h3>
            <p className="text-blue-200 text-[10px] font-mono tracking-widest uppercase mt-0.5">{plan.name} Tier Upgrade</p>
          </div>
          <div className="text-right">
            <p className="text-white font-black text-lg">₹{plan.priceValue}</p>
            <p className="text-blue-200 text-[10px]">One-time Verification</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {loadingSettings ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Loading payment gateway...</p>
            </div>
          ) : (
            <>
              {/* Payee Info */}
              <div className="p-4 bg-slate-950/45 border border-slate-850 rounded-2xl space-y-1.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Payee Information</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Recipient Name:</span>
                  <span className="text-white font-bold">{payeeName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Recipient UPI ID:</span>
                  <span className="text-blue-400 font-mono font-bold">{defaultUpi}</span>
                </div>
              </div>

              {/* Input Forms */}
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block">Your Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-[#070a0e] text-slate-200 text-xs placeholder-slate-650 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block">Your Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={userEmail}
                    onChange={e => setUserEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-[#070a0e] text-slate-200 text-xs placeholder-slate-650 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* UPI ID */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block">Your UPI ID (For transaction match)</label>
                  <input
                    type="text"
                    placeholder="Enter your UPI ID (e.g. name@upi)"
                    value={userUpi}
                    onChange={e => setUserUpi(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-[#070a0e] text-slate-200 text-xs placeholder-slate-650 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handlePay}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Submit Payment</span>
                )}
              </button>
            </>
          )}
        </div>

        <div className="px-6 pb-5 flex items-center justify-between border-t border-slate-850 pt-4">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1">
            <HiX className="text-sm" /> Close
          </button>
          <span className="text-[10px] text-slate-500 font-mono">Immediate activation upgrade</span>
        </div>

      </div>
    </div>
  )
}

/* ─────────────── Main Upgrade Page ─────────────── */
export default function UpgradePage() {
  const { user } = useAuthStore()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const navigate = useNavigate()

  const currentPlan = user?.plan || 'FREE'

  const plans = [
    {
      id: 'FREE',
      name: 'Free',
      price: '₹0',
      priceValue: 0,
      period: 'year',
      quota: '5 GB',
      description: 'Perfect for getting started with secure cloud storage.',
      color: 'from-blue-500 to-cyan-500',
      icon: HiDatabase,
      features: [
        '5 GB Secure Storage',
        'Upload files up to 1 GB',
        'Basic folder creation',
        'AI Auto-Category Classification',
        'AI Semantic Vector Search'
      ]
    },
    {
      id: 'PRO',
      name: 'Go Pro',
      price: '₹499',
      priceValue: 499,
      period: 'year',
      quota: '150 GB',
      description: 'Great for professionals and heavy storage users.',
      color: 'from-purple-500 to-indigo-500',
      icon: HiLightningBolt,
      popular: true,
      features: [
        '150 GB High-Speed SSD Storage',
        'Upload files up to 4 GB',
        'Basic folder creation',
        'AI Auto-Category & Semantic Search',
        'AI Document Summarizer (Summary & Dates)',
        'AI Chat with Document (Ask AI Assistant)',
        'AI Security Monitor (Sensitive Info Scan)'
      ]
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      price: '₹999',
      priceValue: 999,
      period: 'year',
      quota: '1 TB',
      description: 'Ultra-high secure storage capacity for enterprise power users.',
      color: 'from-amber-500 to-orange-500',
      icon: HiStar,
      features: [
        '1 TB (1000 GB) Dedicated Storage',
        'Upload files up to 16 GB',
        'Basic folder creation',
        'AI Auto-Category & Semantic Search',
        'AI Document Summarizer (Summary & Dates)',
        'AI Chat with Document (Ask AI Assistant)',
        'AI Security Monitor (Sensitive Info Scan)',
        'Advanced security & audit logs',
        '24/7 Dedicated Priority Support'
      ]
    }
  ]

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center transition-colors duration-300">

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={async () => {
            setSelectedPlan(null)
            try {
              const headers = { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
              const res = await axios.get('/api/users/me', { headers })
              if (res.data.success) {
                useAuthStore.getState().updateUser(res.data.data)
              }
            } catch (err) {
              console.error('Failed to sync upgraded profile details', err)
            }
          }}
        />
      )}

      {/* Header */}
      <div className="max-w-4xl w-full mb-10 text-center relative px-4">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <HiArrowLeft /> Back
        </button>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent mb-2">
          Upgrade Your Cloud Storage
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm md:text-base">
          Unlock advanced AI integrations, semantic search, and expanded storage capacity.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
        {plans.map((plan) => {
          const PlanIcon = plan.icon
          const isActive = currentPlan === plan.id

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden ${
                isActive
                  ? 'bg-white dark:bg-slate-900 border-2 border-purple-500 shadow-xl'
                  : plan.popular
                  ? 'bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-500/30 shadow-lg'
                  : 'bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 shadow-md'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${plan.color} flex items-center justify-center text-white text-xl shadow-lg`}>
                    <PlanIcon />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight">{plan.name}</h3>
                    <p className="text-xs text-slate-450 font-mono">{plan.quota}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-black">{plan.price}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/ {plan.period}</span>
                </div>
                <div className="text-[10px] text-emerald-500 font-bold mb-4">
                  1 Year Validity
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">{plan.description}</p>
                <hr className="border-slate-100 dark:border-slate-800 mb-5" />

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-650 dark:text-slate-350">
                      <HiCheckCircle className="text-emerald-500 text-base shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {isActive ? (
                  <button disabled className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                    <HiShieldCheck className="text-base" /> Current Plan
                  </button>
                ) : plan.id === 'FREE' ? (
                  <button disabled className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                    Free Tier Active
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-95'
                    }`}
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
