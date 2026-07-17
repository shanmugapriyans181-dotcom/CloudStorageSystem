import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { fileApi, aiApi, userApi } from '../services/api'
import { toast } from 'react-toastify'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiSparkles, HiUpload, HiCalendar, HiExclamation, 
  HiPaperAirplane, HiLockClosed, HiFolderOpen,
  HiBriefcase, HiTrendingUp, HiShieldExclamation, HiLightningBolt,
  HiClipboard
} from 'react-icons/hi'
import clsx from 'clsx'

// Simple helper to format basic Markdown (bold, lists, code blocks, newlines)
function formatMarkdown(text) {
  if (!text) return ''
  
  // Handle code blocks
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).trim()
      return (
        <pre key={i} className="bg-slate-950 p-4 rounded-xl border border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto my-3">
          <code>{code}</code>
        </pre>
      )
    }
    
    // Process line-by-line for headings, lists, bold text
    const lines = part.split('\n')
    return lines.map((line, j) => {
      let formattedLine = line

      // Bold formatting: **text**
      const boldRegex = /\*\*(.*?)\*\*/g
      const elements = []
      let lastIndex = 0
      let match

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          elements.push(line.substring(lastIndex, match.index))
        }
        elements.push(<strong key={match.index} className="font-extrabold text-white">{match[1]}</strong>)
        lastIndex = boldRegex.lastIndex
      }
      
      if (lastIndex < line.length) {
        elements.push(line.substring(lastIndex))
      }

      const content = elements.length > 0 ? elements : formattedLine

      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={j} className="ml-5 list-disc my-1 text-slate-300">
            {line.trim().slice(2)}
          </li>
        )
      }

      // Check for headings
      if (line.startsWith('### ')) {
        return <h4 key={j} className="text-sm font-bold text-slate-100 mt-4 mb-2">{line.slice(4)}</h4>
      }
      if (line.startsWith('## ')) {
        return <h3 key={j} className="text-md font-extrabold text-purple-300 mt-5 mb-2">{line.slice(3)}</h3>
      }
      if (line.startsWith('# ')) {
        return <h2 key={j} className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300 mt-6 mb-3">{line.slice(2)}</h2>
      }

      return (
        <p key={j} className="my-1.5 leading-relaxed text-slate-300">
          {content}
        </p>
      )
    })
  })
}

export default function IpoSummaryPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [activeFileMetadata, setActiveFileMetadata] = useState(null)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  
  // Chat state
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  const queryClient = useQueryClient()
  const [copiedIdx, setCopiedIdx] = useState(null)

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  // User Profile plan details
  const { data: userProfile } = useQuery('user-profile', () => 
    userApi.getProfile().then(res => res.data.data)
  )

  const isProOrEnterprise = 
    userProfile?.plan?.toUpperCase() === 'PRO' || 
    userProfile?.plan?.toUpperCase() === 'ENTERPRISE'

  // Fetch PDFs, Documents, and Images for selection
  const { data: pdfFiles = [], isLoading: filesLoading } = useQuery(
    ['ipo-eligible-files'],
    async () => {
      const pdfs = await fileApi.filter('PDF').then(r => r.data.data || [])
      const docs = await fileApi.filter('DOCUMENT').then(r => r.data.data || [])
      const images = await fileApi.filter('IMAGE').then(r => r.data.data || [])
      // Merge and remove duplicates
      const merged = [...pdfs, ...docs, ...images]
      const ids = new Set()
      return merged.filter(file => {
        if (ids.has(file.id)) return false
        ids.add(file.id)
        return true
      })
    }
  )

  // Reset conversation when active file changes
  useEffect(() => {
    if (selectedFile) {
      setMessages([
        {
          role: 'system',
          text: `Welcome to the **${selectedFile.originalName}** AI Intelligence Hub! I have fully processed this IPO document. Ask me anything about the pricing, timelines, company details, risk factors, or promoter group. I will answer with 100% precision just like ChatGPT!`
        }
      ])
      fetchMetadata(selectedFile.id)
    } else {
      setActiveFileMetadata(null)
    }
  }, [selectedFile])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  const fetchMetadata = async (fileId) => {
    setLoadingMetadata(true)
    try {
      const res = await aiApi.getMetadata(fileId)
      if (res.data?.success) {
        setActiveFileMetadata(res.data.data)
      }
    } catch (err) {
      toast.error('Failed to load AI insights for this document')
    } finally {
      setLoadingMetadata(false)
    }
  }

  // Handle Drag and Drop Upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif']
    },
    multiple: false,
    onDrop: async (accepted) => {
      if (accepted.length === 0) return
      const file = accepted[0]
      
      const planLimits = {
        FREE: 1 * 1024 * 1024 * 1024,
        PRO: 4 * 1024 * 1024 * 1024,
        ENTERPRISE: 16 * 1024 * 1024 * 1024
      }
      const plan = userProfile?.plan?.toUpperCase() || 'FREE'
      const limit = planLimits[plan] || planLimits.FREE

      if (file.size > limit) {
        toast.error(`File exceeds upload limit for your ${plan} plan.`)
        return
      }

      const fd = new FormData()
      fd.append('file', file)
      fd.append('encrypt', 'true')

      const toastId = toast.info(`Uploading & analyzing "${file.name}"...`, { autoClose: false })

      try {
        const response = await fileApi.upload(fd, () => {})
        if (response.data?.success) {
          toast.update(toastId, {
            render: `Successfully uploaded and analyzed "${file.name}"!`,
            type: 'success',
            autoClose: 3000
          })
          queryClient.invalidateQueries(['ipo-eligible-files'])
          setSelectedFile(response.data.data)
        } else {
          toast.update(toastId, {
            render: 'Upload succeeded but AI analysis failed.',
            type: 'warning',
            autoClose: 3000
          })
        }
      } catch (err) {
        toast.update(toastId, {
          render: err.response?.data?.message || 'Failed to upload document',
          type: 'error',
          autoClose: 3000
        })
      }
    }
  })

  // Handle Q&A submissions with full conversation history
  const handleChatSubmit = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading || !selectedFile) return

    const question = chatInput.trim()
    const updatedMessages = [...messages, { role: 'user', text: question }]
    setMessages(updatedMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      // Build conversation history (exclude system messages)
      const history = updatedMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, text: m.text }))
      
      // Remove the last user message from history since we send it as the question
      const contextHistory = history.slice(0, -1)
      
      const res = await aiApi.ask(selectedFile.id, question, contextHistory)
      if (res.data?.success) {
        setMessages(prev => [...prev, { role: 'assistant', text: res.data.data }])
      }
    } catch (err) {
      console.error('Chat Q&A error:', err)
      const serverMsg = err.response?.data?.message || err.message || 'Unknown network error'
      toast.error(`AI assistant failed: ${serverMsg}`)
      setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, I encountered an error checking this document. Details: ${serverMsg}` }])
    } finally {
      setChatLoading(false)
    }
  }

  // Quick Action Buttons
  const runQuickAction = (question) => {
    setChatInput(question)
    setTimeout(() => {
      const form = document.getElementById('chat-form')
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    }, 100)
  }

  // Split and list timeline dates cleanly
  const renderTimeline = (datesText) => {
    if (!datesText || datesText.toLowerCase().includes('no key dates') || datesText.toLowerCase().includes('none')) {
      return (
        <div className="flex gap-3 items-center p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
          <HiCalendar className="text-xl" />
          <span className="text-xs">No important timeline dates parsed yet. Ask the chatbot to extract them!</span>
        </div>
      )
    }

    const items = datesText
      .split('\n')
      .map(item => item.replace(/^-\s*/, '').trim())
      .filter(item => item.length > 0)

    return (
      <div className="relative pl-5 border-l-2 border-purple-500/30 space-y-5 my-2">
        {items.map((dateItem, idx) => (
          <div key={idx} className="relative animate-fade-in">
            <span className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-white dark:border-slate-900 shadow-md ring-4 ring-purple-500/20" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-normal">{dateItem}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-950 dark:text-slate-100 font-sans p-2 select-none selection:bg-purple-500/30">
      {/* Premium Gradient Header */}
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-purple-500/5 via-slate-100/50 to-indigo-500/5 dark:from-purple-950/40 dark:via-slate-900/60 dark:to-indigo-950/40 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl overflow-hidden mb-6">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="flex items-center gap-3.5 z-10">
          <div className="p-3.5 bg-gradient-to-tr from-purple-500 to-indigo-500 text-white rounded-2xl shadow-lg shadow-purple-500/20">
            <HiSparkles className="text-2xl animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              IPO Document Intelligence Hub
              <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-extrabold bg-purple-500/25 text-purple-300 rounded-md border border-purple-500/30">Gemini Powered</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload and chat with prospectuses or Red Herring documents with 100% accuracy</p>
          </div>
        </div>
      </div>

      {!isProOrEnterprise ? (
        // Premium Upgrade Lock State
        <div className="max-w-2xl mx-auto my-16 text-center bg-white/80 dark:bg-slate-900/50 backdrop-blur-2xl border border-slate-200 dark:border-white/10 p-10 rounded-3xl shadow-xl dark:shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="p-5 bg-purple-500/15 text-purple-400 rounded-full w-fit mx-auto mb-6 border border-purple-500/25">
            <HiLockClosed className="text-4xl" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">IPO Document Analyzer is Locked</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-md mx-auto leading-relaxed">
            Parsing large IPO files, generating detailed dashboards, and conversing with dynamic context sizes are exclusive features of the <strong>Go Pro</strong> or <strong>Enterprise</strong> tiers.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <a
              href="/upgrade"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-extrabold text-sm shadow-lg shadow-purple-500/20 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
            >
              Upgrade Plan
            </a>
          </div>
        </div>
      ) : (
        // Main Active Layout
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT PANEL: Document Selector, Upload & Analysis (5 Columns) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col">
            
            {/* File List & Selector Card */}
            <div className="bg-white dark:bg-slate-900/35 backdrop-blur-xl border border-slate-200 dark:border-slate-800/60 p-5 rounded-3xl shadow-xl shadow-purple-950/5 flex flex-col">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-600 dark:text-slate-300 mb-3.5 flex items-center gap-2">
                <HiFolderOpen className="text-purple-400 text-base" />
                Select IPO Document
              </h3>
              
              {/* Dropdown File List */}
              <div className="relative group">
                <select
                  value={selectedFile?.id || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    const found = pdfFiles.find(f => f.id === id)
                    setSelectedFile(found || null)
                  }}
                  className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/40 rounded-2xl px-4 py-3.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 transition-all appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950"
                >
                  <option value="">-- Choose an uploaded File (PDF/Doc/Image) --</option>
                  {pdfFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      📄 {file.originalName} ({(file.fileSize / 1024 / 1024).toFixed(2)} MB)
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
 
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800/80"></div></div>
                <span className="relative bg-white dark:bg-[#0f172a] px-3 text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">or upload new prospectus</span>
              </div>
 
              {/* Dropzone upload area */}
              <div
                {...getRootProps()}
                className={clsx(
                  "border-2 border-dashed rounded-3xl p-5 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[125px] select-none",
                  isDragActive 
                    ? "border-purple-500 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.08)]" 
                    : "border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 hover:border-purple-500/50 hover:bg-slate-100 dark:hover:bg-slate-950/40"
                )}
              >
                <input {...getInputProps()} />
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20 mb-2">
                  <HiUpload className="text-lg animate-pulse" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Drag Prospectus File Here</p>
                <p className="text-[10px] text-slate-500 mt-1">Supports PDF, DOCX, TXT or Image files</p>
              </div>
            </div>
 
            {/* Dashboard Insights Panel (Rendered only when a file is selected) */}
            <div className="flex-1 bg-white dark:bg-slate-900/35 backdrop-blur-xl border border-slate-200 dark:border-slate-800/60 p-5 rounded-3xl shadow-xl shadow-purple-950/5 flex flex-col min-h-[400px]">
              {!selectedFile ? (
                // Empty Selected File State
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <div className="p-4 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-3.5 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <HiFolderOpen className="text-3xl animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-350">No Document Selected</p>
                  <p className="text-[10px] text-slate-500 mt-1.5 max-w-xs leading-relaxed">Select an uploaded prospectus from the dropdown or upload a new one to parse financials, timeline, and risk details instantly.</p>
                </div>
              ) : loadingMetadata ? (
                // Loading Metadata State
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-8 h-8 rounded-full border-2 border-t-purple-500 border-white/10 animate-spin mb-3" />
                  <p className="text-xs font-bold text-slate-400">Analyzing Document Insights...</p>
                  <p className="text-[10px] text-slate-500 mt-1">Extracting timeline, financials, and category details.</p>
                </div>
              ) : (
                // Selected File Dashboard Content
                <div className="space-y-5 flex-1 overflow-y-auto max-h-[550px] pr-1">
                  
                  {/* File Metadata Overview */}
                  <div className="flex gap-4 items-center p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/60 shadow-inner">
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex-shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.08)]">
                      <HiBriefcase className="text-lg" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{selectedFile.originalName}</h4>
                      <p className="text-[9.5px] text-slate-600 dark:text-slate-400 mt-0.5">Size: {(selectedFile.fileSize / 1024 / 1024).toFixed(2)} MB • Category: {activeFileMetadata?.category || "Financials"}</p>
                      {activeFileMetadata?.confidenceScore && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[8.5px] text-slate-500 uppercase font-extrabold tracking-wider">AI Classification:</span>
                          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {activeFileMetadata.confidenceScore.toFixed(0)}% Confidence
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
 
                  {/* Warning Alerts */}
                  {activeFileMetadata?.sensitiveDataFound && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 flex gap-3 items-start">
                      <HiExclamation className="text-lg flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider">Confidential Identifiers Found</h4>
                        <p className="text-[9.5px] text-amber-700 dark:text-amber-400/90 mt-1 leading-relaxed">
                          We parsed sensitive fields: <strong>{activeFileMetadata.sensitiveDataFound}</strong>. Share and print this prospectus carefully.
                        </p>
                      </div>
                    </div>
                  )}
 
                  {/* Timeline section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <HiCalendar className="text-purple-400 text-sm" />
                      IPO Key Timeline & Dates
                    </h4>
                    <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/50 shadow-inner">
                      {renderTimeline(activeFileMetadata?.importantDates)}
                    </div>
                  </div>
 
                  {/* Summary Card */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <HiTrendingUp className="text-purple-400 text-sm" />
                      Executive Summary Preview
                    </h4>
                    <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium shadow-inner max-h-[160px] overflow-y-auto pr-1">
                      {activeFileMetadata?.summary || "No automated summary preview. Try uploading a text-heavy prospectus or asking the chatbot directly."}
                    </div>
                  </div>
 
                  {/* Quick trigger questions */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <HiLightningBolt className="text-slate-450 dark:text-slate-400" />
                      Quick Extract Prompts
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => runQuickAction("What is the issue size and price band of this IPO?")}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 hover:bg-purple-500/10 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/30 text-[10px] text-slate-705 dark:text-slate-300 text-left hover:text-purple-600 dark:hover:text-purple-300 transition-all font-semibold shadow-sm hover:translate-y-[-1px] duration-150"
                      >
                        📊 Size & Price Band
                      </button>
                      <button
                        onClick={() => runQuickAction("What are the key financial strengths and revenues mentioned?")}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 hover:bg-purple-500/10 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/30 text-[10px] text-slate-705 dark:text-slate-300 text-left hover:text-purple-600 dark:hover:text-purple-300 transition-all font-semibold shadow-sm hover:translate-y-[-1px] duration-150"
                      >
                        📈 Key Financial Strengths
                      </button>
                      <button
                        onClick={() => runQuickAction("Summarize all major risk factors or negative highlights.")}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 hover:bg-purple-500/10 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/30 text-[10px] text-slate-705 dark:text-slate-300 text-left hover:text-purple-600 dark:hover:text-purple-300 transition-all font-semibold shadow-sm hover:translate-y-[-1px] duration-150"
                      >
                        ⚠️ Major Risk Factors
                      </button>
                      <button
                        onClick={() => runQuickAction("Who are the promoters and what is their pre and post holding?")}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 hover:bg-purple-500/10 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/30 text-[10px] text-slate-705 dark:text-slate-300 text-left hover:text-purple-600 dark:hover:text-purple-300 transition-all font-semibold shadow-sm hover:translate-y-[-1px] duration-150"
                      >
                        👥 Promoter Holding Info
                      </button>
                    </div>
                  </div>
 
                </div>
              )}
            </div>
          </div>
 
           {/* RIGHT PANEL: ChatGPT-Style Wide Chat (7 Columns) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900/35 backdrop-blur-xl border border-slate-200 dark:border-slate-800/60 rounded-3xl shadow-xl shadow-purple-950/5 flex flex-col overflow-hidden min-h-[500px] h-[75vh]">
            
            {/* Chat Header */}
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <div>
                  <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                    Document Chat Assistant
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase tracking-wider">AI Active</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Ask questions dynamically sourced from current prospectus content.</p>
                </div>
              </div>
              {selectedFile && (
                <button
                  onClick={() => {
                    setMessages([
                      {
                        role: 'system',
                        text: `Conversation restarted. Ask me anything about **${selectedFile.originalName}**!`
                      }
                    ])
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-950 text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all border border-slate-250 dark:border-slate-800"
                >
                  Clear History
                </button>
              )}
            </div>

            {/* Conversational Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, idx) => (
                <div key={idx} className={clsx("flex gap-3 items-start", m.role === 'user' ? "justify-end" : "justify-start")}>
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-purple-500/10 shrink-0">
                      ✨
                    </div>
                  )}
                  <div
                    className={clsx(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed transition-all shadow-sm relative group",
                      m.role === 'user'
                        ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-tr-none"
                        : m.role === 'system'
                          ? "bg-slate-950/60 border border-white/5 text-purple-300/90 text-center mx-auto max-w-[95%] font-medium"
                          : "bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-900/60 text-slate-800 dark:text-slate-200 rounded-tl-none font-medium"
                    )}
                  >
                    {m.role !== 'system' && (
                      <button
                        onClick={() => handleCopy(m.text, idx)}
                        className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center shrink-0 shadow-md"
                        title="Copy message"
                      >
                        {copiedIdx === idx ? (
                          <span className="text-[8px] font-bold text-emerald-400">Copied!</span>
                        ) : (
                          <HiClipboard className="text-xs" />
                        )}
                      </button>
                    )}
                    {m.role === 'assistant' ? (
                      <div className="space-y-1 pr-6">{formatMarkdown(m.text)}</div>
                    ) : (
                      <p className="whitespace-pre-wrap pr-6">{m.text}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-purple-500/10 shrink-0">
                    ✨
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-900/60 text-slate-500 dark:text-slate-400 rounded-2xl rounded-tl-none px-4 py-3.5 text-xs flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Suggestion Chips */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20 flex gap-2 overflow-x-auto select-none no-scrollbar">
              <button
                disabled={!selectedFile || chatLoading}
                onClick={() => runQuickAction("What are the financial objectives of this IPO offer?")}
                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-950/60 hover:bg-purple-600/15 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/30 text-[10px] font-semibold text-slate-650 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 transition-all shrink-0 disabled:opacity-50"
              >
                🎯 Offer Objectives
              </button>
              <button
                disabled={!selectedFile || chatLoading}
                onClick={() => runQuickAction("Can you summarize the company background and operations details?")}
                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-950/60 hover:bg-purple-600/15 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/30 text-[10px] font-semibold text-slate-650 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 transition-all shrink-0 disabled:opacity-50"
              >
                🏢 Company Background
              </button>
              <button
                disabled={!selectedFile || chatLoading}
                onClick={() => runQuickAction("List the merchant bankers and registrar contact info.")}
                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-950/60 hover:bg-purple-600/15 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/30 text-[10px] font-semibold text-slate-650 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 transition-all shrink-0 disabled:opacity-50"
              >
                📞 Merchant Bankers
              </button>
            </div>

            {/* Chat Input Form */}
            <form
              id="chat-form"
              onSubmit={handleChatSubmit}
              className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/80 flex gap-2 items-center"
            >
              <input
                type="text"
                disabled={!selectedFile || chatLoading}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={selectedFile ? "Ask about pricing, promoters, financials, risk factors..." : "Please select or upload a document first"}
                className="flex-1 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/25 rounded-2xl px-4 py-3.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!selectedFile || !chatInput.trim() || chatLoading}
                className="p-3.5 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-md hover:shadow-purple-500/20 disabled:opacity-50 disabled:pointer-events-none hover:brightness-110 active:scale-95 transition-all"
              >
                <HiPaperAirplane className="text-base rotate-90" />
              </button>
            </form>

          </div>

        </div>
      )}
    </div>
  )
}
