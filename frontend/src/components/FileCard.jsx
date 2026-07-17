import {
  HiDotsVertical, HiDownload, HiPencil, HiTrash,
  HiShare, HiEye, HiRefresh
} from 'react-icons/hi'
import { useState } from 'react'
import { fileApi } from '../services/api'
import { toast } from 'react-toastify'
import { useQueryClient } from 'react-query'
import FileIcon from './FileIcon'
import { format } from 'date-fns'

function formatBytes(bytes) {
  if (!bytes) return '—'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ['B','KB','MB','GB'][i]
}

export default function FileCard({ file, viewMode = 'grid', onShare, onPreview, isTrash = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const qc = useQueryClient()

  const handleDownload = async () => {
    try {
      const { data } = await fileApi.download(file.id)
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch {
      toast.error('Download failed')
    }
  }

  const handleTrash = async () => {
    try {
      await fileApi.trash(file.id)
      toast.success('Moved to trash')
      qc.invalidateQueries(['files'])
      qc.invalidateQueries('trash-files')
      qc.invalidateQueries('trash-folders')
      qc.invalidateQueries('dashboard')
    } catch {}
  }

  const handleRestore = async () => {
    try {
      await fileApi.restore(file.id)
      toast.success('File restored')
      qc.invalidateQueries('trash-files')
      qc.invalidateQueries('trash-folders')
      qc.invalidateQueries(['files'])
      qc.invalidateQueries('dashboard')
    } catch {}
  }

  const handlePermanentDelete = async () => {
    if (!confirm('Permanently delete this file? This cannot be undone.')) return
    try {
      await fileApi.permanentDelete(file.id)
      toast.success('File permanently deleted')
      qc.invalidateQueries('trash-files')
      qc.invalidateQueries('trash-folders')
      qc.invalidateQueries('dashboard')
    } catch {}
  }

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50
                      border-b border-gray-100 dark:border-gray-700 group">
        <FileIcon type={file.fileType} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate dark:text-white">{file.name}</p>
            {!isTrash && file.aiMetadata?.category && (
              <span className="px-2 py-0.5 text-[9px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded flex items-center gap-1">
                ✨ {file.aiMetadata.category}
              </span>
            )}
            {!isTrash && file.aiMetadata?.confidenceScore && (
              <span className="px-2 py-0.5 text-[9px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded">
                {Math.round(file.aiMetadata.confidenceScore)}% Match
              </span>
            )}
            {!isTrash && file.aiMetadata?.isDuplicate && (
              <span className="px-2 py-0.5 text-[9px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                Duplicate
              </span>
            )}
            {!isTrash && file.aiMetadata?.sensitiveDataFound && (
              <span className="px-2 py-0.5 text-[9px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded" title={file.aiMetadata.sensitiveDataFound}>
                ⚠️ Sensitive Data
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">{format(new Date(file.updatedAt), 'MMM d, yyyy')}</p>
        </div>
        <span className="text-xs text-gray-400 hidden sm:block">{formatBytes(file.fileSize)}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isTrash && (
            <>
              <button onClick={handleDownload} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Download">
                <HiDownload className="text-gray-500" />
              </button>
              <button onClick={() => onShare?.(file)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Share">
                <HiShare className="text-gray-500" />
              </button>
              <button onClick={handleTrash} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title="Delete">
                <HiTrash className="text-red-400" />
              </button>
            </>
          )}
          {isTrash && (
            <>
              <button onClick={handleRestore} className="p-1.5 hover:bg-green-100 rounded" title="Restore">
                <HiRefresh className="text-green-500" />
              </button>
              <button onClick={handlePermanentDelete} className="p-1.5 hover:bg-red-100 rounded" title="Delete permanently">
                <HiTrash className="text-red-500" />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="file-card group relative">
      {/* File icon / thumbnail */}
      <div className="flex justify-center items-center h-24 mb-3 rounded-lg bg-gray-50 dark:bg-gray-700">
        <FileIcon type={file.fileType} size="lg" />
      </div>

      {/* File info */}
      <p className="text-sm font-medium truncate dark:text-white" title={file.name}>{file.name}</p>
      <p className="text-xs text-gray-400 mt-0.5">{formatBytes(file.fileSize)}</p>

      {/* AI classification / dynamic recommended folder tags */}
      <div className="flex flex-wrap gap-1 mt-2">
        {!isTrash && file.aiMetadata?.category && (
          <span className="px-2.5 py-0.5 text-[9px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center gap-0.5">
            ✨ {file.aiMetadata.category}
          </span>
        )}
        {!isTrash && file.aiMetadata?.confidenceScore && (
          <span className="px-2.5 py-0.5 text-[9px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
            {Math.round(file.aiMetadata.confidenceScore)}% Match
          </span>
        )}
        {!isTrash && file.aiMetadata?.isDuplicate && (
          <span className="px-2.5 py-0.5 text-[9px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
            Duplicate
          </span>
        )}
        {!isTrash && file.aiMetadata?.sensitiveDataFound && (
          <span className="px-2.5 py-0.5 text-[9px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full" title={file.aiMetadata.sensitiveDataFound}>
            ⚠️ Sensitive
          </span>
        )}
      </div>

      {!isTrash && file.aiMetadata?.isDuplicate && (
        <p className="text-[9.5px] font-medium text-rose-400 mt-1.5 flex items-center gap-0.5">
          <span>⚠️ Already exists</span>
        </p>
      )}

      {/* Menu button */}
      <div className="absolute top-2 right-2">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <HiDotsVertical className="text-gray-500" />
        </button>

        {menuOpen && (
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-950 rounded-2xl shadow-xl
                            border border-gray-200 dark:border-white/10 py-1.5 z-20 overflow-hidden"
                 onClick={(e) => e.stopPropagation()}>
              {!isTrash && (
                <>
                  {(file.fileType === 'IMAGE' || file.fileType === 'PDF') && (
                    <button onClick={() => { onPreview?.(file); setMenuOpen(false) }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2 transition-all">
                      <HiEye className="text-slate-400 text-sm shrink-0" /> Preview
                    </button>
                  )}
                  <button onClick={() => { handleDownload(); setMenuOpen(false) }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2 transition-all">
                    <HiDownload className="text-slate-400 text-sm shrink-0" /> Download
                  </button>
                  <button onClick={() => { onShare?.(file); setMenuOpen(false) }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2 transition-all">
                    <HiShare className="text-slate-400 text-sm shrink-0" /> Share
                  </button>
                  <hr className="border-gray-100 dark:border-white/5 my-1.5" />
                  <button onClick={() => { handleTrash(); setMenuOpen(false) }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-all">
                    <HiTrash className="text-red-500 text-sm shrink-0" /> Move to Trash
                  </button>
                </>
              )}
              {isTrash && (
                <>
                  <button onClick={() => { handleRestore(); setMenuOpen(false) }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-green-600 dark:text-green-400 hover:bg-green-500/10 flex items-center gap-2 transition-all">
                    <HiRefresh className="text-green-500 text-sm shrink-0" /> Restore
                  </button>
                  <button onClick={() => { handlePermanentDelete(); setMenuOpen(false) }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-all">
                    <HiTrash className="text-red-500 text-sm shrink-0" /> Delete Forever
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
