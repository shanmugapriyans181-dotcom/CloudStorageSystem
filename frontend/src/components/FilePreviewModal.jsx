import { HiX, HiDownload } from 'react-icons/hi'
import { useEffect, useState } from 'react'

export default function FilePreviewModal({ file, onClose }) {
  const [token, setToken] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('cloud-storage-auth')
    if (stored) {
      try {
        const { state } = JSON.parse(stored)
        if (state?.accessToken) {
          setToken(state.accessToken)
        }
      } catch (e) {}
    }
  }, [])

  const previewUrl = token ? `/api/files/download/${file.id}?token=${token}&disposition=inline` : ''

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4"
         onClick={onClose}>
      <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-white font-medium truncate text-sm">{file.name}</span>
          <button onClick={onClose} className="p-1 text-white hover:text-gray-300">
            <HiX className="text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center p-2 min-h-[350px]">
          {!previewUrl ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <span className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Authorizing preview...</p>
            </div>
          ) : (
            <>
              {file.fileType === 'IMAGE' && (
                <img src={previewUrl} alt={file.name} className="max-w-full max-h-[78vh] mx-auto object-contain rounded-xl shadow-lg" />
              )}
              {file.fileType === 'PDF' && (
                <iframe src={previewUrl} className="w-full h-[78vh] border-0 rounded-xl bg-white" title={file.name} />
              )}
              {file.fileType === 'VIDEO' && (
                <video src={previewUrl} controls className="max-w-full max-h-[78vh] mx-auto rounded-xl shadow-lg" autoPlay />
              )}
              {file.fileType === 'AUDIO' && (
                <div className="w-full p-8 flex justify-center bg-slate-950/50 rounded-xl">
                  <audio src={previewUrl} controls className="w-full max-w-md" autoPlay />
                </div>
              )}
              {!['IMAGE', 'PDF', 'VIDEO', 'AUDIO'].includes(file.fileType) && (
                <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <p className="text-sm font-bold text-slate-200">Preview not supported for this file format ({file.fileType})</p>
                  <a
                    href={previewUrl}
                    download={file.name}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2"
                  >
                    <HiDownload className="text-sm" /> Download File
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
