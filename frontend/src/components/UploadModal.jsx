import { useDropzone } from 'react-dropzone'
import { useState } from 'react'
import { fileApi } from '../services/api'
import { toast } from 'react-toastify'
import { useQueryClient } from 'react-query'
import { HiX, HiUpload, HiCheck } from 'react-icons/hi'
import { useAuthStore } from '../store/authStore'
import clsx from 'clsx'
import DuplicateDialog from './DuplicateDialog'

export default function UploadModal({ onClose, folderId }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const [duplicateData, setDuplicateData] = useState(null)
  const [activeIdx, setActiveIdx] = useState(null)

  const plan = user?.plan?.toUpperCase() || 'FREE'
  const maxUploadSizeLabel = plan === 'PRO' ? '4 GB' : plan === 'ENTERPRISE' ? '16 GB' : '1 GB'

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      const planLimits = {
        FREE: 1 * 1024 * 1024 * 1024,
        PRO: 4 * 1024 * 1024 * 1024,
        ENTERPRISE: 16 * 1024 * 1024 * 1024
      }
      const currentLimit = planLimits[plan] || planLimits.FREE

      const mapped = accepted.map(f => {
        if (f.size > currentLimit) {
          toast.error(`File "${f.name}" exceeds the ${maxUploadSizeLabel} limit for your ${plan} plan.`);
          return { file: f, progress: 0, status: 'error' }
        }
        return { file: f, progress: 0, status: 'pending' }
      })

      setFiles(prev => [
        ...prev,
        ...mapped
      ])
    }
  })

  const uploadFileWithIndex = async (idx, duplicateAction = null, existingFileId = null) => {
    const item = files[idx]
    if (!item) return false
    if (item.status === 'error') return true // skip already invalid file

    const fd = new FormData()
    fd.append('file', item.file)
    if (folderId) fd.append('folderId', folderId)
    fd.append('encrypt', 'true')

    const params = {}
    if (duplicateAction) {
      params.duplicateAction = duplicateAction
    }
    if (existingFileId) {
      params.existingFileId = existingFileId
    }

    try {
      const response = await fileApi.upload(fd, (pct) => {
        setFiles(prev => prev.map((f, i) =>
          i === idx ? { ...f, progress: pct, status: 'uploading' } : f
        ))
      }, params)

      const apiData = response?.data
      if (apiData && apiData.success === false && apiData.data?.duplicate) {
        toast.warning(apiData.message || 'Duplicate file exists!')
        setDuplicateData(apiData.data)
        setActiveIdx(idx)
        setUploading(false)
        return false // stop loop to show dialog
      }

      setFiles(prev => prev.map((f, i) =>
        i === idx ? { ...f, progress: 100, status: 'done' } : f
      ))
      return true
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Upload failed'
      toast.error(errMsg)
      setFiles(prev => prev.map((f, i) =>
        i === idx ? { ...f, status: 'error' } : f
      ))
      return true // proceed to next file on error
    }
  }

  const startUploadLoop = async (startIndex = 0) => {
    setUploading(true)
    let idx = startIndex
    while (idx < files.length) {
      const item = files[idx]
      if (item.status === 'done') {
        idx++
        continue
      }
      
      const success = await uploadFileWithIndex(idx)
      if (!success) {
        return // paused for duplicate check
      }
      idx++
    }

    qc.invalidateQueries(['files'])
    qc.invalidateQueries(['subfolders'])
    qc.invalidateQueries('dashboard')
    qc.invalidateQueries('recent')
    setUploading(false)
    setFiles(currentFiles => {
      const hasSuccessfulUpload = currentFiles.some(f => f.status === 'done')
      if (hasSuccessfulUpload) {
        toast.success('Upload complete')
      } else {
        toast.info('Upload canceled')
      }
      return currentFiles
    })
    setTimeout(onClose, 800)
  }

  const uploadAll = () => {
    startUploadLoop(0)
  }

  const handleResolveDuplicate = async (action) => {
    const idx = activeIdx
    const dup = duplicateData
    setDuplicateData(null)
    setActiveIdx(null)
    setUploading(true)

    const success = await uploadFileWithIndex(idx, action, dup.existingFile?.id)
    if (success) {
      if (action === 'REPLACE') {
        toast.success('File replaced successfully')
      } else if (action === 'KEEP_BOTH') {
        toast.success('File uploaded successfully (renamed)')
      }
      startUploadLoop(idx + 1)
    }
  }

  const handleCancelDuplicate = () => {
    const idx = activeIdx
    setDuplicateData(null)
    setActiveIdx(null)
    
    setFiles(prev => prev.map((f, i) =>
      i === idx ? { ...f, status: 'error' } : f
    ))

    startUploadLoop(idx + 1)
  }

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="relative overflow-hidden bg-slate-900/90 dark:bg-slate-950/80 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_-12px_rgba(99,102,241,0.35)] backdrop-blur-xl animate-scale-up">
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Upload Files</h2>
          <button onClick={onClose} className="p-1.5 bg-slate-800/40 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-white rounded-lg transition-all">
            <HiX />
          </button>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-xl transition-all duration-300 relative overflow-hidden group',
            files.length > 0 ? 'p-4 border-slate-800 bg-slate-900/20' : 'p-10 text-center cursor-pointer border-slate-700 hover:border-indigo-500 bg-slate-900/10 hover:bg-indigo-500/[0.02]',
            isDragActive && 'border-indigo-500 bg-indigo-500/[0.04]'
          )}
        >
          <input {...getInputProps()} />
          
          {files.length === 0 ? (
            <div className="text-center cursor-pointer">
              <div className="mx-auto w-12 h-12 mb-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 group-hover:border-indigo-500/50 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <HiUpload className="text-2xl text-indigo-400 group-hover:text-indigo-300 animate-pulse" />
              </div>
              <p className="text-slate-200 font-semibold text-sm">
                {isDragActive ? 'Drop files here...' : 'Drag & drop files, or click to browse'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">Max size: {maxUploadSizeLabel}</p>
            </div>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="cursor-default">
              <p className="text-[10px] font-bold text-indigo-400/80 mb-3 text-center uppercase tracking-widest font-mono">
                Files Queue ({files.length})
              </p>
              
              <ul className="space-y-2.5 max-h-48 overflow-y-auto px-1">
                {files.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm bg-slate-900/60 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                    {/* Document Icon Symbol */}
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="truncate text-xs font-semibold text-slate-200">{item.file.name}</p>
                        {item.progress > 0 && item.status !== 'done' && (
                          <span className="text-[10px] font-semibold text-indigo-400 font-mono">{item.progress}%</span>
                        )}
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-[5px]">
                        <div
                          className={clsx(
                            'h-[5px] rounded-full transition-all duration-350',
                            item.status === 'error' ? 'bg-rose-500' : 
                            item.status === 'done' ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                          )}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                    {item.status === 'done' && <HiCheck className="text-emerald-400 shrink-0 text-xl animate-scale-up" />}
                    {item.status !== 'uploading' && item.status !== 'done' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(idx) }} 
                        className="shrink-0 text-slate-500 hover:text-rose-400 p-1 bg-slate-800/40 hover:bg-slate-800 rounded-lg transition-all"
                      >
                        <HiX className="text-sm" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              
              <div 
                {...getRootProps()}
                className="mt-4 py-2 bg-slate-900/40 hover:bg-indigo-500/[0.02] border border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg text-center cursor-pointer transition-colors text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-indigo-400 font-mono"
              >
                <input {...getInputProps()} />
                + Add more documents
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 px-4 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 hover:border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-98">
            Cancel
          </button>
          <button
            onClick={uploadAll}
            disabled={files.length === 0 || uploading}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 disabled:shadow-none hover:shadow-indigo-500/30 transition-all active:scale-98"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length || ''} File${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
      {duplicateData && (
        <DuplicateDialog
          duplicateData={duplicateData}
          onResolve={handleResolveDuplicate}
          onCancel={handleCancelDuplicate}
        />
      )}
    </div>
  )
}
