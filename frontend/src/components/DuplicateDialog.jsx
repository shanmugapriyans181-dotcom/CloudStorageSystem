import React from 'react'
import { HiExclamation, HiDocumentDuplicate, HiX } from 'react-icons/hi'
import clsx from 'clsx'

export default function DuplicateDialog({ duplicateData, onResolve, onCancel }) {
  if (!duplicateData) return null

  const { type, message, similarity, existingFile } = duplicateData

  // Curate visual styling based on similarity percentage
  const isExact = similarity === 100
  const isHigh = similarity >= 90 && similarity < 100
  const isPartial = similarity >= 70 && similarity < 90

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700/50 animate-scale-up">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={clsx(
            "p-3 rounded-full shrink-0",
            isExact ? "bg-red-50 text-red-500 dark:bg-red-950/30" :
            isHigh ? "bg-amber-50 text-amber-500 dark:bg-amber-950/30" :
            "bg-blue-50 text-blue-500 dark:bg-blue-950/30"
          )}>
            <HiExclamation className="text-2xl" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Duplicate Detected</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
          </div>
        </div>

        {/* Content Details */}
        <div className="mt-5 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Existing File:</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={existingFile?.name}>
              {existingFile?.name}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Similarity Match:</span>
            <span className={clsx(
              "font-bold px-2 py-0.5 rounded text-[10px]",
              isExact ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400" :
              isHigh ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400" :
              "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
            )}>
              {similarity}% Similarity
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Detection Source:</span>
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              {type === 'FILENAME_DUPLICATE' ? 'Filename Match' :
               type === 'CONTENT_DUPLICATE' ? 'Exact Content (MD5)' : 'AI Semantic Scan'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => onResolve('REPLACE')}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Replace Existing
          </button>
          
          <button
            onClick={() => onResolve('KEEP_BOTH')}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition-all active:scale-95"
          >
            Keep Both (Auto-Rename)
          </button>

          <button
            onClick={onCancel}
            className="w-full py-2 px-4 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 dark:text-red-400 rounded-xl text-xs font-semibold transition-all"
          >
            Cancel Upload
          </button>
        </div>
      </div>
    </div>
  )
}
