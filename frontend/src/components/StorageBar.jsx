import { useQuery } from 'react-query'
import { fileApi } from '../services/api'
import { HiDatabase, HiLightningBolt, HiExclamation } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function StorageBar() {
  const navigate = useNavigate()
  const { data } = useQuery('dashboard', () => fileApi.getDashboard().then(r => r.data.data),
    { staleTime: 60_000 })

  if (!data) return null

  const pct = Math.min(data.usagePercentage, 100)
  const isNearFull = pct >= 90
  const color = isNearFull ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-primary-500'

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <HiDatabase />
          <span className="font-medium">Storage</span>
        </div>
        {userPlanBadge(data.userPlan || 'FREE')}
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div
          className={`${color} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatBytes(data.storageUsed)} / {formatBytes(data.totalStorageQuota)}</span>
        <span>{pct.toFixed(1)}%</span>
      </div>

      <button
        onClick={() => navigate('/upgrade')}
        className="w-full py-1.5 px-3 bg-purple-500/10 dark:bg-purple-500/20 hover:bg-purple-500/20 dark:hover:bg-purple-500/35 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-purple-500/20"
      >
        <HiLightningBolt className="text-xs text-purple-500 fill-purple-500" />
        Upgrade Storage
      </button>

      {isNearFull && (
        <div className="p-2 bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 rounded-lg space-y-1.5">
          <div className="flex items-start gap-1">
            <HiExclamation className="text-red-500 text-xs mt-0.5 shrink-0" />
            <p className="text-[10px] text-red-650 dark:text-red-400 font-semibold leading-tight">
              Storage is almost full! Clear files or upgrade your plan.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/trash')}
              className="flex-1 py-1 px-1 bg-red-600 hover:bg-red-750 text-white rounded text-[9px] font-bold text-center transition-colors"
            >
              Clear Space
            </button>
            <button
              onClick={() => navigate('/upgrade')}
              className="flex-1 py-1 px-1 bg-slate-800 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 rounded text-[9px] font-bold text-center transition-colors"
            >
              Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function userPlanBadge(plan) {
  const p = plan.toUpperCase()
  if (p === 'BASIC') {
    return <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold font-mono">BASIC</span>
  }
  if (p === 'PRO' || p === 'GO_PRO') {
    return <span className="text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold font-mono">PRO</span>
  }
  if (p === 'ENTERPRISE' || p === 'PREMIUM') {
    return <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold font-mono">ENTERPRISE</span>
  }
  return <span className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-bold font-mono">FREE</span>
}
