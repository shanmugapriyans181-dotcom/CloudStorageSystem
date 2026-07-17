import React, { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { fileApi, folderApi, aiApi } from '../services/api'
import { toast } from 'react-toastify'
import FileCard from '../components/FileCard'
import UploadModal from '../components/UploadModal'
import ShareModal from '../components/ShareModal'
import FilePreviewModal from '../components/FilePreviewModal'
import AiSearchbar from '../components/AiSearchbar'
import FileIcon from '../components/FileIcon'
import {
  HiUpload, HiFolderAdd, HiViewGrid, HiViewList,
  HiFolder, HiChevronRight, HiHome, HiPencil, HiTrash, HiSparkles
} from 'react-icons/hi'
import clsx from 'clsx'

const FILE_TYPES = ['ALL', 'IMAGE', 'VIDEO', 'PDF', 'DOCUMENT', 'OTHER']

export default function FilesPage() {
  const { folderId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [viewMode, setViewMode] = useState('grid')
  const [showUpload, setShowUpload] = useState(false)
  const [shareFile, setShareFile] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)
  const [filterType, setFilterType] = useState('ALL')
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [renameName, setRenameName] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchMode, setSearchMode] = useState('standard')
  const [isSearching, setIsSearching] = useState(false)

  const currentFolderId = folderId ? Number(folderId) : null

  const { data: files = [], isLoading: filesLoading } = useQuery(
    ['files', currentFolderId, filterType],
    () => filterType !== 'ALL'
      ? fileApi.filter(filterType).then(r => r.data.data)
      : fileApi.getFiles(currentFolderId).then(r => r.data.data)
  )

  const { data: subFolders = [] } = useQuery(
    ['subfolders', currentFolderId],
    () => currentFolderId
      ? folderApi.getSubFolders(currentFolderId).then(r => r.data.data)
      : folderApi.getRoots().then(r => r.data.data)
  )

  const { data: currentFolder } = useQuery(
    ['folder', currentFolderId],
    () => currentFolderId ? folderApi.getFolder(currentFolderId).then(r => r.data.data) : null,
    { enabled: !!currentFolderId }
  )

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await folderApi.create(newFolderName.trim(), currentFolderId)
      toast.success('Folder created')
      qc.invalidateQueries(['subfolders', currentFolderId])
      setNewFolderName('')
      setShowNewFolder(false)
    } catch {}
  }

  const renameFolder = async (id) => {
    if (!renameName.trim()) return
    try {
      await folderApi.rename(id, renameName.trim())
      toast.success('Folder renamed')
      qc.invalidateQueries(['subfolders', currentFolderId])
      setRenamingFolder(null)
    } catch {}
  }

  const trashFolder = async (id) => {
    if (!confirm('Move folder and all its contents to trash?')) return
    try {
      await folderApi.trash(id)
      toast.success('Folder moved to trash')
      qc.invalidateQueries(['subfolders', currentFolderId])
      qc.invalidateQueries('trash-files')
      qc.invalidateQueries('trash-folders')
    } catch {}
  }

  const handleSearch = async (query, isAi) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    setSearchMode(isAi ? 'ai' : 'standard')
    setIsSearching(true)
    try {
      // Detect if query is a known file type keyword (e.g. "image", "video", "pdf")
      const q = query.trim().toLowerCase()
      const TYPE_KEYWORD_MAP = {
        IMAGE: ['image', 'images', 'photo', 'photos', 'png', 'jpg', 'jpeg', 'gif'],
        VIDEO: ['video', 'videos', 'mp4', 'mov', 'avi', 'recording', 'screen recording'],
        PDF:   ['pdf'],
        DOCUMENT: ['document', 'documents', 'doc', 'docs', 'txt', 'word', 'text'],
        OTHER: ['other'],
      }
      const detectedType = Object.entries(TYPE_KEYWORD_MAP).find(([, keywords]) =>
        keywords.includes(q)
      )?.[0]

      const filePromise = isAi 
        ? aiApi.semanticSearch(query)
        : fileApi.search(query)
      const folderPromise = folderApi.search(query)
      const typePromise = detectedType ? fileApi.filter(detectedType) : Promise.resolve(null)

      const [fileRes, folderRes, typeRes] = await Promise.all([filePromise, folderPromise, typePromise])

      if (fileRes.data.success && folderRes.data.success) {
        // Merge type-filtered results (dedupe by id)
        let files = fileRes.data.data || []
        if (typeRes && typeRes.data.success) {
          const existingIds = new Set(files.map(f => f.id))
          const extra = (typeRes.data.data || []).filter(f => !existingIds.has(f.id))
          files = [...files, ...extra]
        }
        setSearchResults({
          files,
          folders: folderRes.data.data || []
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 pr-0">
      {/* Breadcrumb & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          <button onClick={() => navigate('/files')} className="hover:text-indigo-600 flex items-center gap-1">
            <HiHome /> My Files
          </button>
          {currentFolder && (
            <>
              <HiChevronRight />
              <span className="text-slate-800 dark:text-white font-medium">{currentFolder.name}</span>
            </>
          )}
        </div>
        <AiSearchbar onSearch={handleSearch} />
      </div>

      {/* Inline Search Results Block */}
      {searchQuery.trim() && (
        <div className="space-y-4 border-b border-gray-100 dark:border-white/5 pb-6">
          <div className="flex items-center gap-2">
            <HiSparkles className="text-purple-500 text-lg animate-pulse" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {searchMode === 'ai' ? 'AI Semantic Search Results' : 'Search Results'} for "{searchQuery}"
            </h2>
          </div>
          {isSearching ? (
            <div className="text-slate-500 text-xs">Querying AI vectors...</div>
          ) : !searchResults || (searchResults.files.length === 0 && searchResults.folders.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5">
              No matching files or folders found.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Folders Section */}
              {searchResults.folders.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Folders ({searchResults.folders.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {searchResults.folders.map(folder => (
                      <div key={folder.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/40 border border-gray-250 dark:border-white/10 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all flex items-center gap-2.5 cursor-pointer"
                        onClick={() => navigate(`/files/folder/${folder.id}`)}
                      >
                        <HiFolder className="text-2xl text-yellow-500 shrink-0" />
                        <span className="text-xs font-bold truncate text-slate-800 dark:text-white">{folder.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section */}
              {searchResults.files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Files ({searchResults.files.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {searchResults.files.map(file => (
                      <FileCard key={file.id} file={file}
                        onShare={setShareFile} onPreview={setPreviewFile} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button 
          onClick={() => setShowUpload(true)} 
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm"
        >
          <HiUpload className="text-sm" /> Upload
        </button>
        <button 
          onClick={() => setShowNewFolder(true)} 
          className="px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
        >
          <HiFolderAdd className="text-sm" /> New Folder
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {/* Type filter */}
          <div className="flex gap-1 overflow-x-auto">
            {FILE_TYPES.map(t => (
              <button key={t}
                onClick={() => setFilterType(t)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider',
                  filterType === t
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-gray-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* View mode */}
          <div className="flex ml-2 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
            <button onClick={() => setViewMode('grid')}
              className={clsx('p-2 transition-all', viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10')}>
              <HiViewGrid />
            </button>
            <button onClick={() => setViewMode('list')}
              className={clsx('p-2 transition-all', viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10')}>
              <HiViewList />
            </button>
          </div>
        </div>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex gap-2 items-center bg-white dark:bg-white/5 p-4 rounded-3xl border border-gray-250 dark:border-white/10 shadow-sm animate-fade-in">
          <input
            autoFocus
            type="text"
            placeholder="Folder name"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
            className="w-full max-w-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 text-xs"
          />
          <button onClick={createFolder} className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm">Create</button>
          <button onClick={() => setShowNewFolder(false)} className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 font-semibold text-xs">Cancel</button>
        </div>
      )}

      {/* Folders List */}
      {subFolders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Folders
          </h3>
          <div className={clsx(
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
              : 'bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/10 rounded-3xl divide-y divide-gray-100 dark:divide-white/5 overflow-hidden shadow-sm'
          )}>
            {subFolders.map(folder => (
              <div key={folder.id}
                className={clsx(
                  viewMode === 'grid'
                    ? 'p-4 rounded-3xl bg-white dark:bg-slate-900/40 border border-gray-250 dark:border-white/10 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all group flex flex-col justify-between h-28 cursor-pointer relative'
                    : 'flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 group cursor-pointer transition-colors'
                )}
                onClick={() => navigate(`/files/folder/${folder.id}`)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <HiFolder className="text-3xl text-yellow-500 shrink-0" />
                  {renamingFolder === folder.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameName}
                      onChange={e => setRenameName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameFolder(folder.id); if (e.key === 'Escape') setRenamingFolder(null) }}
                      onClick={e => e.stopPropagation()}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 text-xs w-full"
                    />
                  ) : (
                    <span className="text-xs font-bold truncate text-slate-800 dark:text-white">{folder.name}</span>
                  )}
                </div>
                
                {/* Actions Toolbar */}
                <div 
                  className={clsx(
                    "flex gap-1.5 transition-opacity shrink-0",
                    viewMode === 'grid' 
                      ? 'absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-900/90 p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5' 
                      : 'opacity-0 group-hover:opacity-100'
                  )}
                  onClick={e => e.stopPropagation()}
                >
                  <button onClick={() => { setRenamingFolder(folder.id); setRenameName(folder.name) }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Rename">
                    <HiPencil className="text-xs" />
                  </button>
                  <button onClick={() => trashFolder(folder.id)}
                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-red-400 hover:text-red-600" title="Delete">
                    <HiTrash className="text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="space-y-3">
        {subFolders.length > 0 && (
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Files
          </h3>
        )}
        {filesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="relative overflow-hidden p-4 rounded-3xl bg-slate-900/10 dark:bg-slate-900/40 border border-gray-250 dark:border-white/10 h-36 flex flex-col justify-between animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-gray-250 dark:bg-white/5" />
                  <div className="w-4 h-4 rounded bg-gray-250 dark:bg-white/5" />
                </div>
                <div className="space-y-2">
                  <div className="w-3/4 h-3 rounded bg-gray-250 dark:bg-white/5" />
                  <div className="w-1/2 h-2.5 rounded bg-gray-250 dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="p-16 rounded-3xl bg-white dark:bg-slate-900/40 border border-gray-250 dark:border-white/10 text-center text-slate-500 dark:text-slate-400 shadow-sm">
            <HiFolder className="text-6xl mx-auto mb-3 opacity-20 text-slate-400" />
            <p className="font-semibold text-xs">No files here</p>
            <p className="text-[10px] text-slate-400 mt-1">Upload files or create a subfolder to get started</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {files.map(file => (
              <FileCard key={file.id} file={file}
                onShare={setShareFile} onPreview={setPreviewFile} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/10 rounded-3xl divide-y divide-gray-100 dark:divide-white/5 overflow-hidden shadow-sm">
            {files.map(file => (
              <FileCard key={file.id} file={file} viewMode="list"
                onShare={setShareFile} onPreview={setPreviewFile} />
            ))}
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} folderId={currentFolderId} />}
      {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}
