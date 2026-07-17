import React, { useState } from 'react'
import { HiSparkles, HiSearch } from 'react-icons/hi'

export default function AiSearchbar({ onSearch, placeholder = 'Search files...' }) {
  const [query, setQuery] = useState('')
  const [isAi, setIsAi] = useState(false)

  const handleSearch = (val, aiMode) => {
    setQuery(val)
    onSearch?.(val, aiMode)
  }

  const toggleAi = () => {
    const nextMode = !isAi
    setIsAi(nextMode)
    onSearch?.(query, nextMode)
  }

  return (
    <div className={`relative flex items-center w-full max-w-lg transition-all duration-300 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900/40 border shadow-sm ${
      isAi 
        ? 'border-purple-500 dark:border-purple-500/40 bg-purple-50/40 dark:bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.08)] ring-1 ring-purple-500' 
        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
    }`}>
      <HiSearch className={`text-xl mr-3 transition-colors duration-300 ${isAi ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'}`} />
      
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value, isAi)}
        placeholder={isAi ? "Ask AI (e.g., 'internship certificate' or 'recent tax files')" : placeholder}
        className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-semibold"
      />

      <button
        onClick={toggleAi}
        title={isAi ? "Switch to Standard Search" : "Switch to AI Semantic Search"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all duration-300 shrink-0 ${
          isAi 
            ? 'bg-purple-600 text-white dark:bg-purple-900/30 dark:text-purple-300 border border-purple-500/40 shadow-sm' 
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
        }`}
      >
        <HiSparkles className={isAi ? 'animate-pulse text-white dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'} />
        <span>AI</span>
      </button>
    </div>
  )
}
