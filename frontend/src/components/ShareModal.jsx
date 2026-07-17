import { useState, useEffect } from 'react'
import { fileApi } from '../services/api'
import { toast } from 'react-toastify'
import { 
  HiX, HiClipboard, HiCheck, HiOutlineDeviceMobile, 
  HiOutlineWifi, HiSparkles, HiOutlineDocumentText, 
  HiOutlineColorSwatch, HiOutlineMail, HiUser 
} from 'react-icons/hi'
import { 
  FaWhatsapp, FaEnvelopeOpenText, FaUsers, FaPencilAlt, FaCheck, FaBluetooth 
} from 'react-icons/fa'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ['B','KB','MB','GB','TB'][i]
}

function getFileColor(name) {
  if (!name) return 'bg-slate-500'
  const ext = name.split('.').pop().toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'bg-sky-500'
  if (['pdf'].includes(ext)) return 'bg-red-500'
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return 'bg-blue-600'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'bg-green-600'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'bg-amber-600'
  if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) return 'bg-purple-600'
  return 'bg-slate-500'
}

export default function ShareModal({ file, onClose }) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('VIEW')
  const [isPublic, setIsPublic] = useState(true)
  const [shareToken, setShareToken] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showEmailPanel, setShowEmailPanel] = useState(false)

  // Generate public link on mount automatically
  useEffect(() => {
    const autoGenerateLink = async () => {
      try {
        const { data } = await fileApi.shareFile({
          fileId: file.id,
          permission,
          isPublic: true
        })
        if (data?.data?.shareToken) {
          setShareToken(data.data.shareToken)
        }
      } catch (err) {
        console.error("Auto share link generation failed:", err)
        const errMsg = err.response?.data?.message || err.message || "Unknown error"
        toast.error("Auto-generate link failed: " + errMsg)
      }
    }
    autoGenerateLink()
  }, [file.id, permission])

  const handleShare = async () => {
    if (!email) {
      toast.error('Please enter an email address to invite')
      return
    }
    setLoading(true)
    try {
      const { data } = await fileApi.shareFile({
        fileId: file.id,
        sharedWithEmail: email,
        permission,
        isPublic: false
      })
      toast.success(`Invitation sent to ${email}!`)
      setEmail('')
      setShowEmailPanel(false)
    } catch (err) {
      toast.error('Failed to share file. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getOrGenerateToken = async () => {
    if (shareToken) return shareToken
    setLoading(true)
    try {
      const { data } = await fileApi.shareFile({
        fileId: file.id,
        permission,
        isPublic: true
      })
      if (data?.data?.shareToken) {
        setShareToken(data.data.shareToken)
        return data.data.shareToken
      }
    } catch (err) {
      console.error("Token generation failed:", err)
      toast.error("Failed to generate share link")
    } finally {
      setLoading(false)
    }
    return null
  }

  const copyLink = async () => {
    let token = shareToken
    if (!token) {
      toast.info('Generating link, please wait...')
      token = await getOrGenerateToken()
    }
    if (token) {
      const link = `${window.location.origin}/shared/${token}`
      navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAppShare = async (appId) => {
    let token = shareToken
    if (!token) {
      toast.info('Generating link, please wait...')
      token = await getOrGenerateToken()
    }
    if (token) {
      const link = `${window.location.origin}/shared/${token}`
      
      if (appId === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=Check out my file: ${file.name} - ${link}`, '_blank')
      } else if (appId === 'email') {
        window.open(`mailto:?subject=Shared File: ${file.name}&body=Hi,%0A%0AI have shared a file with you: ${file.name}%0AYou can access it here: ${link}`, '_blank')
      } else if (appId === 'bluetooth') {
        if (navigator.share) {
          navigator.share({
            title: file.name,
            text: `Check out my file: ${file.name}`,
            url: link
          }).catch((err) => {
            console.error("Web share failed:", err)
            copyLink()
          })
        } else {
          copyLink()
        }
      } else {
        copyLink()
      }
    }
  }

  const handleContactClick = (contact) => {
    if (contact.id === 'phone') {
      toast.success('Sending file details to My Phone!')
      return
    }
    setEmail(contact.email)
    setShowEmailPanel(true)
  }

  const contacts = [
    { id: 'phone', name: 'My Phone', initial: '', icon: HiOutlineDeviceMobile, badge: 'phone', color: 'bg-emerald-500 text-white' },
    { id: 'you', name: 'senthamizhselvan S (You)', initial: 'SS', badge: 'teams', email: 'senthamizhselvan@kce.ac.in', color: 'bg-indigo-600 text-white' },
    { id: 'outlook', name: 'outlook_BF1C51...', initial: 'O', badge: 'outlook', email: 'outlook_BF1C518CEB583929@outlook.com', color: 'bg-blue-500 text-white' },
    { id: 'dharani', name: 'Dharani Sri', initial: 'DS', badge: 'teams', email: 'dharanisri@gmail.com', color: 'bg-pink-500 text-white' },
    { id: 'gopika', name: 'Gopika', initial: 'G', badge: 'whatsapp', email: 'gopika@gmail.com', color: 'bg-amber-500 text-white' }
  ]

  const shareApps = [
    { id: 'whatsapp', name: 'WhatsApp', icon: FaWhatsapp, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
    { id: 'email', name: 'Mail', icon: HiOutlineMail, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40' },
    { id: 'bluetooth', name: 'Bluetooth', icon: FaBluetooth, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
    { id: 'copy', name: 'Copy Link', icon: HiClipboard, color: 'text-slate-500 bg-slate-50 dark:bg-slate-950/40' }
  ]

  const ext = file.name.split('.').pop().toUpperCase()

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 transition-all duration-300">
      {/* Fluent UI styled modal container */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-white/10 w-full max-w-[480px] rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col space-y-6">
        
        {/* Header Block */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-base">Share</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 flex items-center justify-center text-slate-650 dark:text-slate-300 transition-colors">
              <HiUser className="text-sm" />
            </button>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            >
              <HiX className="text-sm" />
            </button>
          </div>
        </div>

        {/* File Preview block (Fluent UI Style) */}
        <div className="bg-white dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-200 dark:border-white/[0.06] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Folder / File thumbnail */}
            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white ${getFileColor(file.name)} shadow-md font-mono text-[9px] font-black tracking-tighter shrink-0 select-none`}>
              <span className="text-white/80 text-[18px]">📄</span>
              <span className="-mt-1 font-sans">{ext}</span>
            </div>
            
            {/* File info details */}
            <div className="space-y-0.5 text-left">
              <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-100 truncate max-w-[170px]">{file.name}</h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>{formatBytes(file.fileSize)}</span>
                <span>•</span>
                <select 
                  value={permission} 
                  onChange={(e) => setPermission(e.target.value)} 
                  className="bg-transparent font-medium text-purple-650 dark:text-purple-400 hover:underline outline-none cursor-pointer text-[11px] py-0"
                >
                  <option value="VIEW">Can View</option>
                  <option value="DOWNLOAD">Can Download</option>
                  <option value="EDIT">Can Edit</option>
                </select>
              </p>
            </div>
          </div>

          {/* Quick Actions (Edit/Invite email & Copy Link) */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowEmailPanel(!showEmailPanel)} 
              title="Add people via Email" 
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                showEmailPanel 
                  ? 'bg-purple-600 text-white border-purple-600' 
                  : 'bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <FaPencilAlt className="text-[10px]" /> Edit
            </button>
            <button 
              onClick={copyLink} 
              title="Copy public link" 
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-350 hover:bg-slate-250 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            >
              {copied ? <HiCheck className="text-green-500" /> : <HiClipboard className="text-sm" />}
            </button>
          </div>
        </div>

        {/* Email panel slider for custom shares */}
        {showEmailPanel && (
          <div className="bg-slate-100 dark:bg-slate-950/30 rounded-2xl p-4 border border-slate-200 dark:border-white/5 animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Invite someone by email</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Privately</span>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter email address (e.g. gopika@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field py-2 text-xs flex-1 rounded-xl"
              />
              <button 
                onClick={handleShare} 
                disabled={loading} 
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shrink-0 disabled:opacity-50"
              >
                {loading ? 'Sharing...' : 'Invite'}
              </button>
            </div>
          </div>
        )}



        {/* Share Using Application list Grid */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Share using</span>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {shareApps.map((app) => {
              const AppIcon = app.icon
              return (
                <button 
                  key={app.id} 
                  onClick={() => handleAppShare(app.id)}
                  className="flex flex-col items-center space-y-1.5 group focus:outline-none"
                >
                  <div className={`w-10 h-10 rounded-xl ${app.color} flex items-center justify-center text-lg shadow-sm border border-black/[0.02] dark:border-white/[0.02] group-hover:scale-105 group-hover:shadow-md transition-all duration-200`}>
                    <AppIcon />
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 text-center font-medium leading-tight max-w-[75px] truncate">
                    {app.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
