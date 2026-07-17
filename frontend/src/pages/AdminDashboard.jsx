import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuthStore } from '../store/adminAuthStore'
import {
  HiShieldCheck, HiUsers, HiChartBar, HiClipboardList,
  HiSearch, HiDatabase, HiFolderOpen, HiUserRemove, HiUserAdd,
  HiChevronRight, HiChevronLeft, HiCash, HiTrendingUp, HiDocumentText,
  HiDownload, HiTrash, HiCheckCircle, HiXCircle, HiBell, HiRefresh,
  HiAdjustments, HiEye, HiUserCircle, HiLogout, HiQrcode
} from 'react-icons/hi'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts'
import { toast } from 'react-toastify'
import axios from 'axios'

// Helper for formatting size
function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['B','KB','MB','GB','TB'][i]
}

function getTabBgClass(currentTab) {
  switch (currentTab) {
    case 'dashboard': return 'bg-[#0b0c16]' // Deep Cosmic Navy/Indigo
    case 'users': return 'bg-[#081318]'     // Dark Ocean Teal
    case 'files': return 'bg-[#120a1c]'     // Dark Royal Purple/Eggplant
    case 'payments': return 'bg-[#16120b]'  // Dark Bronze/Amber
    case 'logs': return 'bg-[#08160d]'      // Dark Emerald/Forest Green
    case 'settings': return 'bg-[#150a18]'  // Dark Magenta/Fuchsia
    default: return 'bg-[#080b11]'
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { adminUser: user, adminLogout } = useAdminAuthStore()
  const [tab, setTab] = useState('dashboard')

  // API states
  const [analytics, setAnalytics] = useState(null)
  const [users, setUsers] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [paymentsHistory, setPaymentsHistory] = useState([])
  const [logs, setLogs] = useState([])
  const [files, setFiles] = useState([])
  const [fileSubTab, setFileSubTab] = useState('active') // 'active' or 'deleted'
  const [settings, setSettings] = useState({
    upiId: '',
    adminName: '',
    qrCodeUrl: '',
    freeStorageLimit: 5368709120,
    basicStorageLimit: 10737418240,
    proStorageLimit: 53687091200,
    enterpriseStorageLimit: 107374182400,
    basicPrice: 199,
    proPrice: 499,
    enterprisePrice: 999
  })

  // Table control states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [logsSearchQuery, setLogsSearchQuery] = useState('')
  const [logsPage, setLogsPage] = useState(0)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  const [selectedUser, setSelectedUser] = useState(null)
  const [quotaGbInput, setQuotaGbInput] = useState('')

  // Memoized advanced analytics metrics for 5-star dashboard
  const storageMetrics = React.useMemo(() => {
    let totalUsed = 0
    let totalQuota = 0
    users.forEach(u => {
      totalUsed += u.storageUsed || 0
      totalQuota += u.storageQuota || 0
    })
    const percentUsed = totalQuota > 0 ? (totalUsed / totalQuota * 100) : 0
    return { totalUsed, totalQuota, percentUsed }
  }, [users])

  const activeSessionStats = React.useMemo(() => {
    let online = 0
    let active = 0
    users.forEach(u => {
      if (u.isOnline) online++
      if (u.isActive) active++
    })
    return { online, active, total: users.length }
  }, [users])

  const planBreakdown = React.useMemo(() => {
    const breakdown = { FREE: 0, BASIC: 0, PRO: 0, ENTERPRISE: 0 }
    users.forEach(u => {
      const p = (u.plan || 'FREE').toUpperCase()
      if (breakdown[p] !== undefined) {
        breakdown[p]++
      }
    })
    return breakdown
  }, [users])

  const fileStorageDistribution = React.useMemo(() => {
    const sizes = { IMAGE: 0, VIDEO: 0, PDF: 0, DOCUMENT: 0, OTHER: 0 }
    files.forEach(f => {
      const t = (f.fileType || 'OTHER').toUpperCase()
      const size = f.fileSize || 0
      if (sizes[t] !== undefined) {
        sizes[t] += size
      } else {
        sizes['OTHER'] += size
      }
    })
    const total = Object.values(sizes).reduce((a, b) => a + b, 0)
    return [
      { name: 'Images', value: Math.round(sizes.IMAGE / 1024 / 1024 * 10) / 10, color: '#3b82f6', percent: total ? (sizes.IMAGE / total * 100) : 0, raw: sizes.IMAGE },
      { name: 'Videos', value: Math.round(sizes.VIDEO / 1024 / 1024 * 10) / 10, color: '#a855f7', percent: total ? (sizes.VIDEO / total * 100) : 0, raw: sizes.VIDEO },
      { name: 'PDFs', value: Math.round(sizes.PDF / 1024 / 1024 * 10) / 10, color: '#f43f5e', percent: total ? (sizes.PDF / total * 100) : 0, raw: sizes.PDF },
      { name: 'Documents', value: Math.round(sizes.DOCUMENT / 1024 / 1024 * 10) / 10, color: '#eab308', percent: total ? (sizes.DOCUMENT / total * 100) : 0, raw: sizes.DOCUMENT },
      { name: 'Others', value: Math.round(sizes.OTHER / 1024 / 1024 * 10) / 10, color: '#64748b', percent: total ? (sizes.OTHER / total * 100) : 0, raw: sizes.OTHER }
    ].filter(item => item.raw > 0)
  }, [files])

  // Fetch admin settings & analytics on load
  const loadCoreData = async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${useAdminAuthStore.getState().adminAccessToken}` }
      
      const analRes = await axios.get('/api/admin/analytics', { headers })
      if (analRes.data.success) setAnalytics(analRes.data.data)

      const usersRes = await axios.get('/api/admin/users', { headers })
      if (usersRes.data.success) setUsers(usersRes.data.data)

      const pendingRes = await axios.get('/api/admin/payments/pending', { headers })
      if (pendingRes.data.success) setPendingPayments(pendingRes.data.data)

      const historyRes = await axios.get('/api/admin/payments/history', { headers })
      if (historyRes.data.success) setPaymentsHistory(historyRes.data.data)

      const setRes = await axios.get('/api/admin/settings', { headers })
      if (setRes.data.success) setSettings(setRes.data.data)

      const logsRes = await axios.get(`/api/admin/logs?page=${logsPage}&size=10&search=${encodeURIComponent(logsSearchQuery)}`, { headers })
      if (logsRes.data.success) {
        setLogs(logsRes.data.data.content)
        setLogsTotalPages(logsRes.data.data.totalPages)
      }

      const filesRes = await axios.get('/api/admin/files', { headers })
      if (filesRes.data.success) setFiles(filesRes.data.data)

    } catch (err) {
      console.error(err)
      const is401 = err.response?.status === 401
      if (is401) {
        toast.error('Session expired or unauthorized. Please re-authenticate.')
        adminLogout()
        navigate('/admin')
      } else {
        toast.error(err.response?.data?.message || err.message || 'Error fetching admin data')
      }
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    loadCoreData(true)
    const interval = setInterval(() => {
      loadCoreData(false)
    }, 2000)
    return () => clearInterval(interval)
  }, [logsPage, tab, logsSearchQuery])

  // User Actions
  const handleToggleUserStatus = async (id) => {
    try {
      const headers = { Authorization: `Bearer ${useAdminAuthStore.getState().adminAccessToken}` }
      const res = await axios.patch(`/api/admin/users/${id}/status`, null, { headers })
      if (res.data.success) {
        toast.success(res.data.message)
        loadCoreData()
      }
    } catch (err) {
      toast.error('Failed to change user status')
    }
  }

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user permanently? This will remove all files.')) return
    try {
      const headers = { Authorization: `Bearer ${useAdminAuthStore.getState().adminAccessToken}` }
      const res = await axios.delete(`/api/admin/users/${id}`, { headers })
      if (res.data.success) {
        toast.success('User deleted successfully')
        loadCoreData()
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete user'
      toast.error(msg)
    }
  }

  const handleUpdateQuota = async (id) => {
    const gb = parseFloat(quotaGbInput)
    if (isNaN(gb) || gb <= 0) {
      toast.error('Please enter a valid GB size')
      return
    }
    const bytes = Math.round(gb * 1024 * 1024 * 1024)
    setUpdatingId(id)
    try {
      const headers = { Authorization: `Bearer ${useAdminAuthStore.getState().adminAccessToken}` }
      await axios.patch(`/api/admin/users/${id}/storage-quota`, null, {
        params: { quotaBytes: bytes },
        headers
      })
      toast.success('Storage limit updated successfully')
      setSelectedUser(null)
      loadCoreData()
    } catch (err) {
      toast.error('Failed to update storage quota')
    } finally {
      setUpdatingId(null)
    }
  }

  // Payment Verification Actions
  const handleVerifyPayment = async (paymentId, action) => {
    try {
      const headers = { Authorization: `Bearer ${useAdminAuthStore.getState().adminAccessToken}` }
      const res = await axios.post('/api/admin/payments/verify', null, {
        params: { paymentId, action },
        headers
      })
      if (res.data.success) {
        toast.success(res.data.message)
        loadCoreData()
      }
    } catch (err) {
      toast.error('Failed to verify transaction')
    }
  }

  // Settings Actions
  const handleSaveSettings = async (e) => {
    e.preventDefault()
    try {
      const headers = { Authorization: `Bearer ${useAdminAuthStore.getState().adminAccessToken}` }
      const res = await axios.put('/api/admin/settings', settings, { headers })
      if (res.data.success) {
        toast.success('Settings updated successfully')
        loadCoreData()
      }
    } catch (err) {
      toast.error('Failed to update settings')
    }
  }


  const handleExportData = (targetTab, format) => {
    const dataToExport = targetTab === 'payments' ? paymentsHistory : logs
    if (!dataToExport || dataToExport.length === 0) {
      toast.warning('No data available to export')
      return
    }

    if (format === 'csv') {
      let csvContent = ''
      if (targetTab === 'payments') {
        const headers = ['ID', 'UPI ID', 'Transaction Ref', 'Amount', 'Plan Name', 'Status', 'Date']
        const rows = dataToExport.map(p => [
          p.id,
          `"${p.upiId || ''}"`,
          `"${p.transactionReference || ''}"`,
          p.amount,
          `"${p.planName || ''}"`,
          `"${p.status || ''}"`,
          `"${p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}"`
        ])
        csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      } else {
        const headers = ['ID', 'Username', 'Action', 'Resource', 'Resource Type', 'Size', 'IP Address', 'Timestamp']
        const rows = dataToExport.map(log => [
          log.id,
          `"${log.username || 'N/A'}"`,
          `"${log.action || ''}"`,
          `"${log.resourceName || ''}"`,
          `"${log.resourceType || ''}"`,
          `"${log.fileSize ? formatBytes(log.fileSize) : 'N/A'}"`,
          `"${log.ipAddress || ''}"`,
          `"${log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}"`
        ])
        csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `${targetTab}_report_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`${targetTab.toUpperCase()} CSV report downloaded`)
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('Please allow popups to export PDF reports')
        return
      }

      let title = targetTab === 'payments' ? 'Payment Verifications Report' : 'Security & Audit Logs Report'
      let tableHeaders = ''
      let tableRows = ''

      if (targetTab === 'payments') {
        tableHeaders = `
          <tr>
            <th>ID</th>
            <th>UPI ID</th>
            <th>Transaction Ref</th>
            <th>Amount</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        `
        tableRows = dataToExport.map(p => `
          <tr>
            <td>${p.id}</td>
            <td>${p.upiId || '-'}</td>
            <td>${p.transactionReference || '-'}</td>
            <td>₹${p.amount}</td>
            <td><span class="badge ${p.planName === 'ENTERPRISE' ? 'badge-enterprise' : 'badge-pro'}">${p.planName || 'FREE'}</span></td>
            <td><span class="status ${p.status === 'APPROVED' ? 'status-approved' : 'status-pending'}">${p.status}</span></td>
            <td>${p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
          </tr>
        `).join('')
      } else {
        tableHeaders = `
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Action</th>
            <th>Resource</th>
            <th>Type</th>
            <th>Size</th>
            <th>IP Address</th>
            <th>Timestamp</th>
          </tr>
        `
        tableRows = dataToExport.map(log => `
          <tr>
            <td>${log.id}</td>
            <td><strong>${log.username || 'N/A'}</strong></td>
            <td>${log.action || '-'}</td>
            <td>${log.resourceName || '-'}</td>
            <td>${log.resourceType || '-'}</td>
            <td>${log.fileSize ? formatBytes(log.fileSize) : 'N/A'}</td>
            <td><code>${log.ipAddress || '-'}</code></td>
            <td>${log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}</td>
          </tr>
        `).join('')
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                color: #1e293b;
                margin: 40px;
                background: #ffffff;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 20px;
                font-weight: 800;
                color: #4f46e5;
              }
              .title {
                font-size: 24px;
                font-weight: 700;
                margin: 0;
                color: #0f172a;
              }
              .meta {
                font-size: 11px;
                color: #64748b;
                text-align: right;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th {
                background: #f8fafc;
                text-align: left;
                padding: 12px 16px;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-weight: 700;
                color: #475569;
                border-bottom: 2px solid #cbd5e1;
              }
              td {
                padding: 12px 16px;
                font-size: 12px;
                border-bottom: 1px solid #e2e8f0;
                color: #334155;
              }
              tr:nth-child(even) {
                background: #f8fafc;
              }
              code {
                font-family: monospace;
                background: #f1f5f9;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
              }
              .badge {
                font-size: 10px;
                padding: 3px 8px;
                border-radius: 6px;
                font-weight: 700;
              }
              .badge-enterprise { background: #fef3c7; color: #d97706; }
              .badge-pro { background: #f3e8ff; color: #7e22ce; }
              .status {
                font-size: 10px;
                padding: 3px 8px;
                border-radius: 12px;
                font-weight: 700;
              }
              .status-approved { background: #dcfce7; color: #15803d; }
              .status-pending { background: #fee2e2; color: #b91c1c; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="logo">SmartCloud AI</div>
                <h1 class="title">${title}</h1>
              </div>
              <div class="meta">
                <div>Exported By: Administrator</div>
                <div>Date: ${new Date().toLocaleString()}</div>
                <div>Total Records: ${dataToExport.length}</div>
              </div>
            </div>
            <table>
              <thead>
                ${tableHeaders}
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handleAdminLogout = () => {
    adminLogout()
    toast.info('Logged out from Admin Console')
    navigate('/admin')
  }

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault()
    setSearchQuery(searchInput)
  }

  // Filters
  const filteredUsersList = users.filter(u => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true

    if (query === 'online') return u.isOnline
    if (query === 'offline') return !u.isOnline

    return u.username?.toLowerCase().includes(query)
  })

  const filteredLogsList = logs.filter(log => {
    if (!logsSearchQuery) return true
    const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : ''
    const dateLocal = log.createdAt ? new Date(log.createdAt).toLocaleString() : ''
    const searchLower = logsSearchQuery.toLowerCase()
    return dateStr.toLowerCase().includes(searchLower) ||
           dateLocal.toLowerCase().includes(searchLower) ||
           log.username?.toLowerCase().includes(searchLower) ||
           log.action?.toLowerCase().includes(searchLower) ||
           log.resourceName?.toLowerCase().includes(searchLower) ||
           log.ipAddress?.toLowerCase().includes(searchLower)
  })

  const sideMenu = [
    { key: 'dashboard', label: 'Admin Dashboard', icon: HiChartBar },
    { key: 'users', label: 'Users Directory', icon: HiUsers },
    { key: 'files', label: 'System Files', icon: HiFolderOpen },
    { key: 'payments', label: 'Payment Verifications', icon: HiCash },
    { key: 'logs', label: 'Security & Audit Logs', icon: HiClipboardList },
    { key: 'settings', label: 'Console Settings', icon: HiAdjustments }
  ]

  return (
    <div className={`min-h-screen text-slate-100 flex font-sans transition-all duration-500 ${getTabBgClass(tab)}`}>
      
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-[#120f26] to-[#0a0717] border-r border-purple-500/10 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-purple-500/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-black text-sm">
            A
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white">SmartCloud AI</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Console Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sideMenu.map(m => {
            const Icon = m.icon
            const isSel = tab === m.key
            return (
              <button
                key={m.key}
                onClick={() => setTab(m.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  isSel
                    ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400 font-extrabold'
                    : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="text-base shrink-0" />
                <span>{m.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-purple-500/10">
          <button
            onClick={handleAdminLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-transparent text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <HiLogout className="text-base" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-mono font-semibold tracking-widest text-blue-500 uppercase">SmartCloud Portal</span>
            <h2 className="text-xl font-bold tracking-tight text-white capitalize mt-0.5">{tab} Panel</h2>
          </div>

          <div className="flex items-center gap-4">
            {(tab === 'payments' || tab === 'logs') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportData(tab, 'csv')}
                  title="Export as CSV"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                >
                  <HiDownload className="text-base text-blue-450" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => handleExportData(tab, 'pdf')}
                  title="Export as PDF"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                >
                  <HiDocumentText className="text-base text-rose-500" />
                  <span>PDF</span>
                </button>
              </div>
            )}
            
            <button
              onClick={loadCoreData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
            >
              <HiRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs">
              <HiUserCircle className="text-lg text-blue-500" />
              <span className="font-bold">{user?.username}</span>
              <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-widest font-mono">
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* Loading overlay indicator */}
        {loading && (
          <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse z-50" />
        )}

        {/* ─────────────── TAB: DASHBOARD ─────────────── */}
        {tab === 'dashboard' && analytics && (
          <div className="space-y-8 animate-fade-in text-slate-100">
            
            {/* Professional Welcome Banner */}
            <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-slate-900 border border-slate-800/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md">
              {/* Background glowing blobs */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none -ml-20 -mb-20" />
              
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-550"></span>
                    </span>
                    <span className="text-[9px] font-mono tracking-widest text-emerald-400 font-semibold uppercase">
                      Core Operations Online
                    </span>
                  </div>
                  
                  <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                    Welcome back,{' '}
                    <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                      {user?.fullName || 'System Administrator'}
                    </span>
                  </h1>
                  
                  <p className="text-xs lg:text-sm text-slate-400 max-w-2xl leading-relaxed font-normal">
                    SmartCloud AI management console is loaded. Monitor global usage rates, plan upgrades, system logs, and approve payments in real-time.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl min-w-[200px] self-start lg:self-auto shadow-inner">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-450 text-lg shadow-sm">
                    <HiUsers />
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">Active Traffic</span>
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {activeSessionStats.online} User{activeSessionStats.online === 1 ? '' : 's'} Online
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium 5-Metric Card Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
              {[
                { 
                  label: 'Total Accounts', 
                  value: users.length, 
                  subtext: `${activeSessionStats.active} Active Profiles`,
                  color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-400', 
                  icon: HiUsers 
                },
                { 
                  label: 'System Files', 
                  value: files.length, 
                  subtext: files.length > 0 ? `Avg: ${formatBytes(storageMetrics.totalUsed / files.length)}` : '0 files',
                  color: 'from-purple-500/10 to-indigo-500/10 border-purple-500/20 text-purple-400', 
                  icon: HiFolderOpen 
                },
                { 
                  label: 'Total Storage', 
                  value: formatBytes(storageMetrics.totalUsed), 
                  subtext: `Max Cap: ${formatBytes(storageMetrics.totalQuota)}`,
                  color: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400', 
                  icon: HiDatabase 
                },
                { 
                  label: 'Total Revenue', 
                  value: `₹${analytics.totalRevenue?.toLocaleString('en-IN')}`, 
                  subtext: 'Upgrades Billings',
                  color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400', 
                  icon: HiCash 
                },
                { 
                  label: 'Online Sessions', 
                  value: activeSessionStats.online, 
                  subtext: 'Active WebSockets',
                  color: 'from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/20 text-fuchsia-400', 
                  icon: HiTrendingUp 
                }
              ].map(({ label, value, subtext, color, icon: Icon }) => (
                <div key={label} className={`relative overflow-hidden p-5 rounded-2xl bg-gradient-to-tr ${color} border shadow-lg flex flex-col justify-between transition-all hover:scale-[1.02] duration-300`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{label}</span>
                    <Icon className="text-lg opacity-80" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{value}</h3>
                    <span className="text-[9px] text-slate-500 font-medium block">{subtext}</span>
                  </div>
                </div>
              ))}
            </div>



            {/* Professional Charts Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Chart: Storage Consumption per User */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    Storage Consumption by User
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Top 5 Accounts</span>
                </div>
                
                <div className="h-64">
                  {analytics.storageByUser && analytics.storageByUser.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="y" data={analytics.storageByUser}>
                        <defs>
                          <linearGradient id="storageColor" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.85}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.15} />
                        <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={formatBytes} />
                        <YAxis type="category" dataKey="username" stroke="#64748b" tick={{ fontSize: 10 }} width={85} />
                        <Tooltip 
                          formatter={(v) => formatBytes(v)}
                          contentStyle={{ backgroundColor: '#0c0f17', borderColor: '#1e293b', borderRadius: '12px' }}
                        />
                        <Bar dataKey="storageUsed" fill="url(#storageColor)" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs gap-2 py-8">
                      <HiDatabase className="text-3xl text-slate-700 animate-pulse" />
                      <span>No active user storage consumption data yet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Chart: Storage Allocation by File Type (Donut Chart) */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Storage Allocation by Format
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">System-wide filetypes</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                  <div className="h-56 flex justify-center items-center">
                    {fileStorageDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={fileStorageDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {fileStorageDistribution.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(v) => [`${v} MB`, 'Storage Used']}
                            contentStyle={{ backgroundColor: '#0c0f17', borderColor: '#1e293b', borderRadius: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs gap-2 py-8 text-center">
                        <HiFolderOpen className="text-3xl text-slate-700 animate-pulse" />
                        <span>No files uploaded to classify yet</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Customized HTML Legend list showing values, counts, colors */}
                  <div className="space-y-2.5">
                    {fileStorageDistribution.length > 0 ? (
                      fileStorageDistribution.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-850 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                            <span className="font-semibold text-slate-300">{entry.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-white block">{entry.value} MB</span>
                            <span className="text-[9px] text-slate-500 font-bold">{Math.round(entry.percent)}% of files</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-xs text-center py-4">Upload files to view formatting logs</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Monospace System Security & Activity logs Feed */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                  Live System Security & Activity Logs Feed
                </h3>
                <button 
                  onClick={() => setTab('logs')}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-all"
                >
                  View All Logs <HiChevronRight />
                </button>
              </div>
              
              <div className="space-y-2.5 font-mono text-xs">
                {logs && logs.length > 0 ? (
                  logs.slice(0, 5).map(log => {
                    let badgeColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                    if (log.action === 'LOGIN') badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                    if (log.action === 'UPLOAD') badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    if (log.action === 'DELETE') badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';

                    return (
                      <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-900 hover:border-slate-800 transition-all">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-widest ${badgeColor}`}>
                            {log.action}
                          </span>
                          <span className="text-slate-300 font-semibold">{log.user?.username || 'System'}</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400 max-w-sm md:max-w-md truncate">
                            {log.resourceName || 'no resource info'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 shrink-0">
                          <span>IP: {log.ipAddress || 'Unknown'}</span>
                          <span>{new Date(log.createdAt).toLocaleString('en-IN', { hour12: false })}</span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-6 text-slate-600">No logs generated yet. Try login or upload operations.</div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ─────────────── TAB: USERS ─────────────── */}
        {tab === 'users' && (
          <div className="space-y-6 animate-fade-in">
            <form onSubmit={handleSearchSubmit} className="flex items-stretch gap-3">
              <div className="flex-1 relative flex items-center px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                <HiSearch className="text-slate-500 mr-3 text-lg" />
                <input
                  type="text"
                  placeholder="Search username or type 'online' / 'offline'..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 w-full"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg hover:shadow-blue-500/20"
              >
                Search
              </button>
            </form>

            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-950/40">
                    <th className="p-5">Account Profile</th>
                    <th className="p-5">Email Address</th>
                    <th className="p-5">Storage Usage</th>
                    <th className="p-5">Current Plan</th>
                    <th className="p-5">Previous Plan</th>
                    <th className="p-5">Session</th>
                    <th className="p-5">Status</th>
                    <th className="p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredUsersList.map(u => (
                    <tr key={u.id} className="hover:bg-slate-900/20 transition-all">
                      <td className="p-5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{u.username}</p>
                          <p className="text-[10px] text-slate-500">Joined: {new Date(u.createdAt).toLocaleString()}</p>
                          {u.lastLogin && <p className="text-[9px] text-slate-500 font-mono">Last Login: {new Date(u.lastLogin).toLocaleString()}</p>}
                        </div>
                      </td>
                      <td className="p-5 text-xs text-slate-400 font-medium">{u.email}</td>
                      <td className="p-5 text-xs text-slate-300 font-mono">
                        {formatBytes(u.storageUsed)} / {formatBytes(u.storageQuota)}
                      </td>
                      <td className="p-5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider ${
                          u.plan === 'BASIC' ? 'bg-blue-500/10 border border-blue-500/25 text-blue-400' :
                          u.plan === 'PRO' || u.plan === 'GO_PRO' ? 'bg-purple-500/10 border border-purple-500/25 text-purple-400' :
                          u.plan === 'ENTERPRISE' || u.plan === 'PREMIUM' ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400' :
                          'bg-slate-500/10 border border-slate-550/20 text-slate-400'
                        }`}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider ${
                          u.previousPlan === 'BASIC' ? 'bg-blue-500/10 border border-blue-500/25 text-blue-400' :
                          u.previousPlan === 'PRO' || u.previousPlan === 'GO_PRO' ? 'bg-purple-500/10 border border-purple-500/25 text-purple-400' :
                          u.previousPlan === 'ENTERPRISE' || u.previousPlan === 'PREMIUM' ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400' :
                          'bg-slate-550/10 border border-slate-700/20 text-slate-500'
                        }`}>
                          {u.previousPlan || 'FREE'}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${
                          u.isOnline ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            u.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-650'
                          }`} />
                          {u.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          u.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="p-5 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedUser(u)
                            setQuotaGbInput((u.storageQuota / (1024 ** 3)).toFixed(0))
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all text-[10px] uppercase font-bold"
                        >
                          Modify Quota
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u.id)}
                          className={`px-2.5 py-1.5 rounded-lg border transition-all text-[10px] uppercase font-bold ${
                            u.isActive
                              ? 'border-rose-500/20 hover:border-rose-500/40 text-rose-400'
                              : 'border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400'
                          }`}
                        >
                          {u.isActive ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg border border-red-550/20 hover:bg-red-550/15 text-red-400 transition-all inline-flex items-center justify-center align-middle"
                        >
                          <HiTrash className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quota Modal */}
            {selectedUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Modify Storage Quota</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure maximum upload limit for <strong className="text-slate-200">{selectedUser.username}</strong>.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block">Capacity (GB)</label>
                    <input
                      type="number"
                      value={quotaGbInput}
                      onChange={e => setQuotaGbInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-[#070a0e] text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateQuota(selectedUser.id)}
                      disabled={updatingId !== null}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {updatingId !== null ? 'Updating...' : 'Apply Limit'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────── TAB: FILES ─────────────── */}
        {tab === 'files' && (() => {
          const activeFilesList = files.filter(f => !f.isDeleted)
          const deletedFilesList = files.filter(f => f.isDeleted)
          const displayedFiles = fileSubTab === 'active' ? activeFilesList : deletedFilesList

          return (
            <div className="space-y-6 animate-fade-in">
              {/* File Sub-Tabs */}
              <div className="flex gap-4 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setFileSubTab('active')}
                  className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                    fileSubTab === 'active'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  Active Files ({activeFilesList.length})
                </button>
                <button
                  onClick={() => setFileSubTab('deleted')}
                  className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                    fileSubTab === 'deleted'
                      ? 'bg-rose-600/90 text-white shadow-lg shadow-rose-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  Deleted Files ({deletedFilesList.length})
                </button>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-950/40">
                      <th className="p-5">File</th>
                      <th className="p-5">Owner</th>
                      <th className="p-5">Type</th>
                      <th className="p-5">Size</th>
                      <th className="p-5">{fileSubTab === 'active' ? 'Uploaded On' : 'Deleted On'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {displayedFiles.map(f => (
                      <tr key={f.id} className="hover:bg-slate-900/20 transition-all text-xs">
                        <td className="p-5 font-bold text-white max-w-[280px]">
                          <div className="flex flex-col">
                            <span className="truncate">{f.name}</span>
                            {f.aiMetadata?.isDuplicate && (
                              <div className="flex gap-0.5 mt-1">
                                <span className="w-fit px-1.5 py-0.5 text-[9px] font-black bg-yellow-500/10 border border-yellow-500/25 text-yellow-450 rounded">
                                  Duplicate
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-5 text-slate-400 font-mono">{f.ownerName || '—'}</td>
                        <td className="p-5 text-slate-400">{f.fileType || '—'}</td>
                        <td className="p-5 text-slate-300 font-mono">{formatBytes(f.fileSize)}</td>
                        <td className="p-5 text-slate-500">
                          {fileSubTab === 'active'
                            ? new Date(f.createdAt).toLocaleString()
                            : f.deletedAt ? new Date(f.deletedAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                    {displayedFiles.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-5 text-center text-slate-500">
                          {fileSubTab === 'active' ? 'No active system files found.' : 'No deleted files found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {/* ─────────────── TAB: PAYMENTS ─────────────── */}
        {tab === 'payments' && (
          <div className="space-y-8 animate-fade-in">
            {/* Upgrade Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Total Earnings</span>
                  <h3 className="text-xl font-bold text-emerald-400">
                    ₹{paymentsHistory.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('en-IN')}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xl shadow-lg">
                  <HiCash />
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Upgraded Users Count</span>
                  <h3 className="text-xl font-bold text-blue-400">
                    {paymentsHistory.length} Users
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xl shadow-lg">
                  <HiUsers />
                </div>
              </div>
            </div>

            {/* History Table */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Complete Upgrade Logs</h3>
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-950/40">
                      <th className="p-5">Username</th>
                      <th className="p-5">Email Address</th>
                      <th className="p-5">Upgraded Plan</th>
                      <th className="p-5 text-right">Amount Paid</th>
                      <th className="p-5 text-right">Upgrade Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {paymentsHistory.map(ph => (
                      <tr key={ph.id} className="hover:bg-slate-900/20 transition-all text-xs">
                        <td className="p-5 font-bold text-white">
                          {ph.user?.username || 'User'}
                        </td>
                        <td className="p-5 text-slate-400 font-medium">{ph.user?.email || '—'}</td>
                        <td className="p-5">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider ${
                            ph.planName === 'BASIC' ? 'bg-blue-500/10 border border-blue-500/25 text-blue-400' :
                            ph.planName === 'PRO' || ph.planName === 'GO_PRO' ? 'bg-purple-500/10 border border-purple-500/25 text-purple-400' :
                            ph.planName === 'ENTERPRISE' || ph.planName === 'PREMIUM' ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400' :
                            'bg-slate-500/10 border border-slate-550/20 text-slate-400'
                          }`}>
                            {ph.planName || 'PRO'}
                          </span>
                        </td>
                        <td className="p-5 font-black text-slate-200 text-right">₹{ph.amount}</td>
                        <td className="p-5 text-slate-400 font-mono text-right">
                          {ph.createdAt ? new Date(ph.createdAt).toLocaleString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                    {paymentsHistory.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-5 text-center text-slate-500">No payment upgrades found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────── TAB: LOGS ─────────────── */}
        {tab === 'logs' && (
          <div className="space-y-6 animate-fade-in">
            {/* Logs Search Input */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/40 border border-slate-800 rounded-3xl shadow-xl">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Logs Search Filter</h3>
                <p className="text-[10px] text-slate-500 mt-1">Filter logs by date, month, year (e.g. 17/07/2026), user, actions or IP.</p>
              </div>
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  value={logsSearchQuery}
                  onChange={e => setLogsSearchQuery(e.target.value)}
                  placeholder="Search by date (DD/MM/YYYY), user, action..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 text-xs transition-all"
                />
                <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-950/40">
                    <th className="p-5">Account User</th>
                    <th className="p-5">Security Action</th>
                    <th className="p-5">Target Resource</th>
                    <th className="p-5">IP Address</th>
                    <th className="p-5 text-right">Audit Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {logs.map((log, index) => (
                    <tr key={index} className="hover:bg-slate-900/20 transition-all text-xs">
                      <td className="p-5 font-bold text-white">{log.user?.fullName || log.user?.username || '—'}</td>
                      <td className="p-5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                          log.action?.includes('DELETE') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          log.action?.includes('LOGIN') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-slate-850 text-slate-400 border border-slate-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-5 text-slate-300 font-mono">{log.resourceName || '—'}</td>
                      <td className="p-5 text-slate-400 font-mono">{log.ipAddress || '—'}</td>
                      <td className="p-5 text-slate-500 text-right">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-10 text-center text-slate-500 font-medium">
                        No logs match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setLogsPage(p => Math.max(0, p - 1))}
                  disabled={logsPage === 0}
                  className="px-4 py-2.5 rounded-xl border border-slate-850 text-xs font-semibold bg-slate-900/40 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <HiChevronLeft className="text-base" />
                </button>
                <span className="text-xs text-slate-500 font-bold">Page {logsPage + 1} of {logsTotalPages}</span>
                <button
                  onClick={() => setLogsPage(p => p + 1)}
                  disabled={logsPage >= logsTotalPages - 1}
                  className="px-4 py-2.5 rounded-xl border border-slate-850 text-xs font-semibold bg-slate-900/40 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <HiChevronRight className="text-base" />
                </button>
              </div>
            )}
          </div>
        )}


        {/* ─────────────── TAB: SETTINGS ─────────────── */}
        {tab === 'settings' && (
          <div className="max-w-2xl animate-fade-in">
            <form onSubmit={handleSaveSettings} className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Admin Control Configurations</h3>
                <p className="text-xs text-slate-400 mt-1">Configure pricing values, limit caps, and payment QR settings.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1.5">UPI ID (pa)</label>
                  <input
                    type="text"
                    value={settings.upiId || ''}
                    onChange={e => setSettings(prev => ({ ...prev, upiId: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-950/40 text-slate-200 text-xs focus:outline-none"
                    placeholder="e.g. admin@upi"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1.5">Admin / Display Name (pn)</label>
                  <input
                    type="text"
                    value={settings.adminName || ''}
                    onChange={e => setSettings(prev => ({ ...prev, adminName: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-950/40 text-slate-200 text-xs focus:outline-none"
                    placeholder="e.g. SmartCloud AI Admin"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1.5">Gemini AI API Key</label>
                <input
                  type="password"
                  value={settings.geminiApiKey || ''}
                  onChange={e => setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-950/40 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="Enter your Gemini API key (e.g. AIzaSy...)"
                />
                <p className="text-[9px] text-slate-500 mt-1">Allows the AI Assistant to read and chat with documents (e.g., summarize, explain or extract details of PDFs).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1.5">Basic Price (₹)</label>
                  <input
                    type="number"
                    value={settings.basicPrice || ''}
                    onChange={e => setSettings(prev => ({ ...prev, basicPrice: parseFloat(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-950/40 text-slate-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1.5">Pro Price (₹)</label>
                  <input
                    type="number"
                    value={settings.proPrice || ''}
                    onChange={e => setSettings(prev => ({ ...prev, proPrice: parseFloat(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-950/40 text-slate-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1.5">Enterprise Price (₹)</label>
                  <input
                    type="number"
                    value={settings.enterprisePrice || ''}
                    onChange={e => setSettings(prev => ({ ...prev, enterprisePrice: parseFloat(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-850 bg-slate-950/40 text-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
