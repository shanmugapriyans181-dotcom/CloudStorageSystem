import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import { HiCloud, HiDownload, HiDocument, HiEye } from 'react-icons/hi'
import { toast } from 'react-toastify'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ['B','KB','MB','GB'][i]
}

export default function PublicSharePage() {
  const { token } = useParams()
  const [shareInfo, setShareInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    const fetchShare = async () => {
      try {
        const { data } = await api.get(`/files/shared/public/${token}`)
        setShareInfo(data.data)
      } catch (err) {
        setError(err?.response?.data?.message || 'This link is invalid or has expired')
      } finally {
        setLoading(false)
      }
    }
    fetchShare()
  }, [token])

  const handleDownload = async () => {
    try {
      const { data } = await api.get(`/files/shared/public/${token}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = shareInfo.fileName
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch {
      toast.error('Download failed')
    }
  }

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const { data } = await api.get(`/files/shared/public/${token}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([data], { type: shareInfo.contentType }))
      setPreviewUrl(url)
    } catch {
      toast.error('Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-950 dark:to-gray-900
                    flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <HiCloud className="text-3xl text-primary-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">CloudStorage</span>
          </div>
        </div>

        <div className="card p-8">
          {loading && (
            <div className="text-center text-gray-400 py-8">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading shared file...
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Link Not Available
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
            </div>
          )}

          {shareInfo && !loading && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center
                                justify-center mx-auto mb-4">
                  <HiDocument className="text-3xl text-primary-600" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  {shareInfo.fileName}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatBytes(shareInfo.fileSize)} · Shared by {shareInfo.ownerName}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">File type</span>
                  <span className="font-medium dark:text-white">{shareInfo.fileType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Permission</span>
                  <span className="font-medium dark:text-white">{shareInfo.permission}</span>
                </div>
                {shareInfo.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Expires</span>
                    <span className="font-medium dark:text-white">{shareInfo.expiresAt}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {(shareInfo.fileType === 'IMAGE' || shareInfo.fileType === 'PDF') && (
                  <button onClick={handlePreview} disabled={previewing}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2">
                    <HiEye /> {previewing ? 'Loading...' : 'Preview'}
                  </button>
                )}
                {shareInfo.permission !== 'VIEW' && (
                  <button onClick={handleDownload} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <HiDownload /> Download
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview modal */}
        {previewUrl && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
               onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}>
            <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <button onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}
                className="absolute -top-8 right-0 text-white hover:text-gray-300 text-sm">
                Close ✕
              </button>
              {shareInfo.fileType === 'IMAGE' && (
                <img src={previewUrl} alt={shareInfo.fileName}
                     className="max-w-full max-h-[85vh] mx-auto rounded-xl object-contain" />
              )}
              {shareInfo.fileType === 'PDF' && (
                <iframe src={previewUrl} className="w-full h-[85vh] rounded-xl" title={shareInfo.fileName} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
