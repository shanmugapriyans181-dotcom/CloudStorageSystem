import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { fileApi } from '../services/api'
import { toast } from 'react-toastify'
import FileIcon from '../components/FileIcon'
import { format } from 'date-fns'
import { HiShare, HiX, HiDownload } from 'react-icons/hi'

function formatBytes(bytes) {
  if (!bytes) return '—'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ['B','KB','MB','GB'][i]
}

export default function SharedPage() {
  const [tab, setTab] = useState('with-me')
  const qc = useQueryClient()

  const { data: sharedWithMe = [] } = useQuery(
    'shared-with-me',
    () => fileApi.getSharedWithMe().then(r => r.data.data)
  )

  const { data: sharedByMe = [] } = useQuery(
    'shared-by-me',
    () => fileApi.getSharedByMe().then(r => r.data.data)
  )

  const handleRevoke = async (shareId) => {
    try {
      await fileApi.revokeShare(shareId)
      toast.success('Share revoked')
      qc.invalidateQueries('shared-by-me')
    } catch {}
  }

  const handleDownload = async (file) => {
    try {
      const { data } = await fileApi.download(file.id)
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  const currentList = tab === 'with-me' ? sharedWithMe : sharedByMe

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <HiShare className="text-primary-600" /> Shared Files
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage files shared with you and files you've shared
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {[
          { key: 'with-me', label: 'Shared with me' },
          { key: 'by-me',   label: 'Shared by me' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* File list */}
      {currentList.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <HiShare className="text-6xl mx-auto mb-3 opacity-20" />
          <p className="font-medium">No shared files yet</p>
          <p className="text-sm mt-1">
            {tab === 'with-me'
              ? 'Files shared with you will appear here'
              : 'Share files from your storage to see them here'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span className="col-span-5">File</span>
            <span className="col-span-3">{tab === 'with-me' ? 'Shared by' : 'Shared with'}</span>
            <span className="col-span-2">Permission</span>
            <span className="col-span-2">Date</span>
          </div>

          {currentList.map(share => (
            <div key={share.id}
              className="grid grid-cols-12 items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <FileIcon type={share.file?.fileType} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate dark:text-white">{share.file?.name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(share.file?.fileSize)}</p>
                </div>
              </div>
              <div className="col-span-3">
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {tab === 'with-me' ? share.ownerEmail : (share.sharedWithEmail || 'Public link')}
                </p>
              </div>
              <div className="col-span-2">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  share.permission === 'EDIT'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : share.permission === 'DOWNLOAD'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {share.permission}
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {share.createdAt ? format(new Date(share.createdAt), 'MMM d') : '—'}
                </span>
                <div className="flex gap-1">
                  {tab === 'with-me' && (
                    <button onClick={() => handleDownload(share.file)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Download">
                      <HiDownload className="text-gray-500 text-sm" />
                    </button>
                  )}
                  {tab === 'by-me' && (
                    <button onClick={() => handleRevoke(share.id)}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title="Revoke">
                      <HiX className="text-red-400 text-sm" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
