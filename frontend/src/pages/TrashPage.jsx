import React from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { fileApi, folderApi } from '../services/api'
import { toast } from 'react-toastify'
import FileCard from '../components/FileCard'
import { HiTrash, HiRefresh, HiFolder } from 'react-icons/hi'

export default function TrashPage() {
  const qc = useQueryClient()

  const { data: trashedFiles = [], isLoading: filesLoading } = useQuery(
    'trash-files',
    () => fileApi.getTrash().then(r => r.data.data),
    { refetchInterval: 2000 }
  )

  const { data: trashedFolders = [], isLoading: foldersLoading } = useQuery(
    'trash-folders',
    () => folderApi.getTrash().then(r => r.data.data),
    { refetchInterval: 2000 }
  )

  const restoreFolder = async (id) => {
    try {
      await folderApi.restore(id)
      toast.success('Folder restored')
      qc.invalidateQueries('trash-folders')
      qc.invalidateQueries('trash-files')
      qc.invalidateQueries(['files'])
      qc.invalidateQueries('dashboard')
    } catch {}
  }

  const handlePermanentDeleteFolder = async (id) => {
    if (!confirm('Permanently delete this folder and all its files? This action CANNOT be undone.')) return
    try {
      await folderApi.permanentDelete(id)
      toast.success('Folder permanently deleted')
      qc.invalidateQueries('trash-folders')
      qc.invalidateQueries('trash-files')
      qc.invalidateQueries('dashboard')
    } catch {
      toast.error('Failed to permanently delete folder')
    }
  }

  const isEmpty = trashedFiles.length === 0 && trashedFolders.length === 0

  return (
    <div className="space-y-6 animate-fade-in pr-0 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <HiTrash className="text-rose-500" /> Trash Storage
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Review and restore deleted files/folders, or permanently erase them from the server.
          </p>
        </div>
      </div>

      {(filesLoading || foldersLoading) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse bg-gray-100 dark:bg-white/5 rounded-3xl" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="p-20 rounded-3xl bg-white dark:bg-slate-900/40 border border-gray-250 dark:border-white/10 text-center text-slate-500 dark:text-slate-400 shadow-sm">
          <HiTrash className="text-6xl mx-auto mb-3 opacity-20 text-slate-450" />
          <p className="font-semibold text-xs">Trash is empty</p>
          <p className="text-[10px] text-slate-450 mt-1">Deleted items will accumulate here.</p>
        </div>
      ) : (
        <>
          {/* Folders Section */}
          {trashedFolders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Folders ({trashedFolders.length})
              </h3>
              <div className="bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/10 rounded-3xl divide-y divide-gray-100 dark:divide-white/5 overflow-hidden shadow-sm">
                {trashedFolders.map(folder => (
                  <div key={folder.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <HiFolder className="text-3xl text-yellow-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-slate-800 dark:text-white">{folder.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => restoreFolder(folder.id)}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                      >
                        <HiRefresh className="text-green-500 text-sm" /> Restore
                      </button>
                      <button 
                        onClick={() => handlePermanentDeleteFolder(folder.id)}
                        className="px-3.5 py-2 rounded-xl border border-rose-250 dark:border-rose-950 text-red-500 font-semibold text-xs flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <HiTrash className="text-rose-500 text-sm" /> Delete Forever
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {trashedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Files ({trashedFiles.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {trashedFiles.map(file => (
                  <FileCard key={file.id} file={file} isTrash={true} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
