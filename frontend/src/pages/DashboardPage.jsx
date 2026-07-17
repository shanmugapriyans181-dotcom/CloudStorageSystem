import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { fileApi, folderApi, userApi, aiApi } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Link } from 'react-router-dom'
import FileCard from '../components/FileCard'
import FileIcon from '../components/FileIcon'
import AiSearchbar from '../components/AiSearchbar'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { 
  HiFolder, HiDocument, HiPhotograph, HiFilm, HiUpload, 
  HiSparkles, HiExclamation, HiClipboardList, HiOutlineClock 
} from 'react-icons/hi'
import UploadModal from '../components/UploadModal'
import ShareModal from '../components/ShareModal'
import FilePreviewModal from '../components/FilePreviewModal'
import { format } from 'date-fns'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ['B','KB','MB','GB','TB'][i]
}

const TYPE_COLORS = { IMAGE: '#818cf8', VIDEO: '#c084fc', PDF: '#f87171', DOCUMENT: '#34d399', OTHER: '#a7f3d0' }

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [showUpload, setShowUpload] = useState(false)
  const [shareFile, setShareFile] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchMode, setSearchMode] = useState('standard')
  const [isSearching, setIsSearching] = useState(false)

  // User activity logs
  const [activities, setActivities] = useState([])

  const qc = useQueryClient()

  const { data: dashboard } = useQuery(
    'dashboard', 
    () => fileApi.getDashboard().then(r => r.data.data),
    { refetchInterval: 2000 }
  )
  const { data: recentFiles = [] } = useQuery(
    'recent', 
    () => fileApi.getRecent(6).then(r => r.data.data),
    { refetchInterval: 2000 }
  )

  // Fetch user activity logs with auto-refresh every 2 seconds
  useEffect(() => {
    const fetchActivities = () => {
      userApi.getActivity()
        .then(res => {
          if (res.data.success) {
            setActivities(res.data.data)
          }
        })
        .catch(err => console.error("Error loading activity logs", err))
    }

    fetchActivities()
    const interval = setInterval(fetchActivities, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = async (query, isAi) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    setSearchMode(isAi ? 'ai' : 'standard')
    setIsSearching(true)
    try {
      // Detect if query is a known file type keyword (e.g. "image", "video", "pdf")
      const q = query.trim().toLowerCase()
      const TYPE_KEYWORD_MAP = {
        IMAGE: ['image', 'images', 'photo', 'photos', 'png', 'jpg', 'jpeg', 'gif'],
        VIDEO: ['video', 'videos', 'mp4', 'mov', 'avi', 'recording', 'screen recording'],
        PDF:   ['pdf'],
        DOCUMENT: ['document', 'documents', 'doc', 'docs', 'txt', 'word', 'text'],
        OTHER: ['other'],
      }
      const detectedType = Object.entries(TYPE_KEYWORD_MAP).find(([, keywords]) =>
        keywords.includes(q)
      )?.[0]

      const filePromise = isAi
        ? aiApi.semanticSearch(query)
        : fileApi.search(query)
      const folderPromise = folderApi.search(query)
      const typePromise = detectedType ? fileApi.filter(detectedType) : Promise.resolve(null)

      const [fileRes, folderRes, typeRes] = await Promise.all([filePromise, folderPromise, typePromise])

      if (fileRes.data.success && folderRes.data.success) {
        // Merge type-filtered results (dedupe by id)
        let files = fileRes.data.data || []
        if (typeRes && typeRes.data.success) {
          const existingIds = new Set(files.map(f => f.id))
          const extra = (typeRes.data.data || []).filter(f => !existingIds.has(f.id))
          files = [...files, ...extra]
        }
        setSearchResults({
          files,
          folders: folderRes.data.data || []
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  const pieData = dashboard
    ? Object.entries(dashboard.storageByType || {}).map(([name, value]) => ({ name, value }))
    : []

  const barData = dashboard
    ? Object.entries(dashboard.fileCountByType || {}).map(([name, count]) => ({ name, count }))
    : []

  const pct = dashboard ? Math.min(dashboard.usagePercentage, 100) : 0
  const barColor = pct > 90 ? '#ef4444' : pct > 75 ? '#fbbf24' : '#8b5cf6'

  // Analyze files loaded to find duplicate and sensitive counts for insights
  const duplicateFiles = recentFiles.filter(f => f.aiMetadata?.isDuplicate)
  const sensitiveFiles = recentFiles.filter(f => f.aiMetadata?.sensitiveDataFound)

  const statCards = [
    { label: 'Total Files', value: dashboard?.totalFiles ?? '—', icon: HiDocument, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Folders', value: dashboard?.totalFolders ?? '—', icon: HiFolder, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { label: 'Images', value: dashboard?.fileCountByType?.IMAGE ?? 0, icon: HiPhotograph, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { label: 'Videos', value: dashboard?.fileCountByType?.VIDEO ?? 0, icon: HiFilm, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-500/10' },
  ]

  return (
    <div className="space-y-8 animate-fade-in pb-12 pr-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            Welcome back, {user?.fullName || user?.username} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
            Manage your secure documents and intelligent cloud storage logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AiSearchbar onSearch={handleSearch} />
          <button 
            onClick={() => setShowUpload(true)} 
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all duration-200"
          >
            <HiUpload className="text-lg" /> Upload
          </button>
        </div>
      </div>

      {/* AI Insights & Alerts Center */}
      {(duplicateFiles.length > 0 || sensitiveFiles.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sensitiveFiles.length > 0 && (
            <div className="p-4 rounded-3xl bg-amber-50/70 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 flex gap-3.5 items-start shadow-sm shadow-amber-500/5">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <HiExclamation className="text-2xl animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">AI Security Monitor</h3>
                <p className="text-xs text-amber-800/85 dark:text-slate-300 mt-1 leading-relaxed">
                  We found sensitive records (e.g. Aadhaar/PAN/Bank info) in <strong className="text-amber-955 dark:text-white">{sensitiveFiles.length}</strong> of your documents. Check alerts before public sharing.
                </p>
              </div>
            </div>
          )}
          {duplicateFiles.length > 0 && (
            <div className="p-4 rounded-3xl bg-rose-50/70 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 flex gap-3.5 items-start shadow-sm shadow-rose-500/5">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <HiSparkles className="text-2xl animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-900 dark:text-rose-300">AI Storage Optimizer</h3>
                <p className="text-xs text-rose-800/85 dark:text-slate-300 mt-1 leading-relaxed">
                  Duplicate contents detected in <strong className="text-rose-955 dark:text-white">{duplicateFiles.length}</strong> documents. Delete duplicated items to retrieve storage capacity.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Results Block */}
      {searchQuery.trim() && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HiSparkles className="text-purple-400 text-lg animate-pulse" />
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              {searchMode === 'ai' ? (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 font-extrabold">
                  ✨ AI Semantic Search Results
                </span>
              ) : (
                'Search Results'
              )}{' '}
              for <span className="underline decoration-purple-500/40">"{searchQuery}"</span>
            </h2>
          </div>
          {isSearching ? (
            <div className="text-slate-400 text-xs py-4">Scanning documents...</div>
          ) : !searchResults || (searchResults.files.length === 0 && searchResults.folders.length === 0) ? (
            <div className="p-8 rounded-3xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold shadow-inner">
              No matching files or folders found.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Folders Section */}
              {searchResults.folders.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Folders ({searchResults.folders.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {searchResults.folders.map(folder => (
                      <div key={folder.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/10 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all flex items-center gap-2.5 cursor-pointer"
                        onClick={() => navigate(`/files/folder/${folder.id}`)}
                      >
                        <HiFolder className="text-2xl text-yellow-500 shrink-0" />
                        <span className="text-xs font-bold truncate text-slate-800 dark:text-white">{folder.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Files Section */}
              {searchResults.files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Files ({searchResults.files.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {searchResults.files.map(file => (
                      <FileCard key={file.id} file={file}
                        onShare={setShareFile} onPreview={setPreviewFile} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Storage and Stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage overview */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/10 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cloud Storage Space</p>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1.5">
                  {formatBytes(dashboard?.storageUsed ?? 0)}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                    / {formatBytes(dashboard?.totalStorageQuota ?? 0)}
                  </span>
                </h2>
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${pct > 90 ? 'bg-red-500/10 text-red-400' : pct > 75 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-purple-500/10 text-purple-400'}`}>
                {pct.toFixed(1)}% Used
              </span>
            </div>
            
            <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-3.5 p-0.5 border border-slate-200 dark:border-white/5">
              <div
                className="h-2 rounded-full transition-all duration-700 shadow-inner"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 border-t border-gray-100 dark:border-white/5 pt-4">
            <span>Available: {formatBytes(dashboard?.storageAvailable ?? 0)}</span>
            <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold uppercase">Safe & Encrypted</span>
          </div>
        </div>

        {/* Quick count details */}
        <div className="grid grid-cols-2 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="p-5 rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className={`p-2.5 rounded-2xl ${bg} flex items-center justify-center`}>
                  <Icon className={`text-xl ${color}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{value}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts section */}
      {pieData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/10 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Storage Distribution
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85}
                       paddingAngle={4} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(v, name) => [formatBytes(v), name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {pieData.map(({ name, value }) => (
                <span key={name} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                  <span className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: TYPE_COLORS[name] || '#64748b' }} />
                  <strong className="font-bold text-slate-800 dark:text-slate-100">{name}</strong> ({formatBytes(value)})
                </span>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/10 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              File Categories count
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={36}>
                  <defs>
                    <linearGradient id="barCatColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={1}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800 opacity-20" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Bar dataKey="count" fill="url(#barCatColor)" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Recent Files & Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent files list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Recent Files</h2>
            <Link to="/files" className="text-xs font-bold text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 uppercase tracking-wider">View all</Link>
          </div>
          {recentFiles.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900/40 border border-gray-250 dark:border-white/10 text-center text-slate-500 dark:text-slate-400 shadow-sm">
              <HiDocument className="text-5xl mx-auto mb-3 opacity-20 text-slate-400" />
              <p className="text-xs">No files yet. Upload your first secure document!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {recentFiles.map(file => (
                <FileCard key={file.id} file={file}
                  onShare={setShareFile} onPreview={setPreviewFile} />
              ))}
            </div>
          )}
        </div>

        {/* Activity Timeline widget */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/40 border border-gray-250 dark:border-white/10 flex flex-col shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <HiOutlineClock className="text-xl text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Activity Timeline</h3>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin">
            {activities.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-10">No recent logs found.</div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex gap-3 text-xs">
                  <div className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block ring-4 ring-purple-500/20" />
                    <span className="w-[1.5px] bg-gray-100 dark:bg-white/10 flex-1 my-1" />
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{act.action} • {act.resourceType || 'System'}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{act.resourceName || act.details || 'User event completed'}</p>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block mt-1">{new Date(act.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}
