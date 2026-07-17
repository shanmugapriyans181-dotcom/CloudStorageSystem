import React, { useState, useEffect, useRef } from 'react'
import { HiSparkles, HiX, HiPaperAirplane, HiCalendar, HiExclamation, HiFolderOpen } from 'react-icons/hi'
import { aiApi, userApi } from '../services/api'
import { toast } from 'react-toastify'

export default function AiAssistantPanel({ file, onClose }) {
  const [activeTab, setActiveTab] = useState('insights') // 'insights' or 'chat'
  const [messages, setMessages] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    userApi.getProfile()
      .then(res => {
        if (res.data?.success) {
          setUser(res.data.data)
        }
      })
      .catch(() => {})
  }, [])

  const plan = user?.plan?.toUpperCase() || 'FREE'
  const isEnterprise = plan === 'ENTERPRISE'
  const isPro = plan === 'PRO'
  const hasInsights = isPro || isEnterprise
  const hasChat = isPro || isEnterprise

  useEffect(() => {
    // Reset conversation when file changes
    setMessages([
      {
        role: 'system',
        text: `Hi! I am your AI Document Assistant. I have analyzed **${file.originalName}** and am ready to answer your questions. Ask me anything about this document!`
      }
    ])
  }, [file])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!query.trim() || loading) return

    const userMessage = { role: 'user', text: query }
    setMessages((prev) => [...prev, userMessage])
    const currentQuery = query
    setQuery('')
    setLoading(true)

    try {
      const res = await aiApi.ask(file.id, currentQuery)
      if (res.data.success) {
        setMessages((prev) => [...prev, { role: 'assistant', text: res.data.data }])
      }
    } catch (err) {
      toast.error('AI assistant failed to respond')
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error searching this document.' }])
    } finally {
      setLoading(false)
    }
  }

  const ai = file.aiMetadata

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900/80 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col z-50 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <HiSparkles className="text-xl text-purple-400 animate-pulse" />
          <h2 className="text-md font-bold text-slate-100">SmartCloud AI Assistant</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200">
          <HiX className="text-lg" />
        </button>
      </div>

      {/* File Info */}
      <div className="p-5 bg-white/5 border-b border-white/5 flex gap-3.5 items-start">
        <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <HiFolderOpen className="text-2xl" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-200 truncate">{file.originalName}</h3>
          <p className="text-xs text-slate-400">{(file.fileSize / 1024 / 1024).toFixed(2)} MB • {file.contentType}</p>
          {ai?.category && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-600/30 text-purple-300 border border-purple-500/20">
              {ai.category}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'insights' 
              ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          AI Insights
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'chat' 
              ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Document Chat
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {activeTab === 'insights' ? (
          !hasInsights ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/25 flex flex-col items-center text-center space-y-3.5 shadow-lg my-2 animate-scale-up">
              <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 text-2xl border border-purple-500/25 animate-bounce">
                <HiSparkles />
              </div>
              <h4 className="text-xs font-bold text-slate-200">Unlock AI Document Insights</h4>
              <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed font-medium">
                AI summaries, key points, safety scan warnings, and important dates extraction are exclusive to the **Go Pro** tier.
              </p>
              <a
                href="/upgrade"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-extrabold text-xs shadow-md transition-all duration-300 hover:brightness-110 hover:-translate-y-0.5"
              >
                Upgrade to Go Pro
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Security Alerts */}
              {ai?.sensitiveDataFound && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex gap-3 items-start">
                  <HiExclamation className="text-xl flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Confidential Data Detected</h4>
                    <p className="text-xs text-amber-400/90 mt-1">
                      This file contains sensitive identifiers: <strong>{ai.sensitiveDataFound}</strong>. Use caution when sharing.
                    </p>
                  </div>
                </div>
              )}

              {/* Duplicate File Alert */}
              {ai?.isDuplicate && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex gap-3 items-start">
                  <HiExclamation className="text-xl flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">This document already exists.</h4>
                    <p className="text-xs text-rose-400/90 mt-1">
                      Highly similar content (&gt;90%) matches: <strong>{ai.duplicateOfFileName || 'another document'}</strong>. Remove it to save storage.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">AI Summary</h4>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 leading-relaxed">
                  {ai?.summary || "No summary available. Start by uploading a readable text or PDF file."}
                </div>
              </div>

              {/* Key Points */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Key Points</h4>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 space-y-2 leading-relaxed">
                  {ai?.keyPoints ? (
                    <div className="prose prose-invert text-xs" dangerouslySetInnerHTML={{ __html: ai.keyPoints.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p className="text-slate-400">No key points extracted.</p>
                  )}
                </div>
              </div>

              {/* Important Dates */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Important Dates</h4>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 flex gap-3 items-center">
                  <HiCalendar className="text-xl text-slate-400" />
                  <span className="text-xs leading-relaxed">
                    {ai?.importantDates || "No key dates identified."}
                  </span>
                </div>
              </div>
            </div>
          )
        ) : (
          !hasChat ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="p-4 rounded-full bg-purple-500/10 text-purple-400 text-3xl border border-purple-500/25 shadow-lg animate-pulse">
                <HiSparkles />
              </div>
              <h3 className="text-sm font-bold text-slate-200">AI Document Chat is Locked</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Interactive document questioning is exclusive to the **Go Pro** tier. Upgrade to Go Pro to unlock AI assistant Q&A.
              </p>
              <a
                href="/upgrade"
                className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-extrabold text-xs shadow-lg hover:brightness-110 hover:-translate-y-0.5 transition-all duration-300"
              >
                Upgrade to Go Pro
              </a>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Conversation logs */}
              <div className="flex-1 space-y-4 overflow-y-auto mb-4">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-purple-600 text-white rounded-tr-none'
                        : m.role === 'system'
                          ? 'bg-slate-800 text-slate-400 text-center mx-auto'
                          : 'bg-white/5 border border-white/10 text-slate-300 rounded-tl-none'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 text-slate-400 rounded-xl rounded-tl-none px-4 py-2.5 text-xs flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Q&A Input */}
              <form onSubmit={handleAsk} className="flex gap-2 border-t border-white/10 pt-4 bg-slate-900/40">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about project deadlines, budgets..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-purple-500/50"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <HiPaperAirplane className="text-sm rotate-90" />
                </button>
              </form>
            </div>
          )
        )}
      </div>
    </div>
  )
}
