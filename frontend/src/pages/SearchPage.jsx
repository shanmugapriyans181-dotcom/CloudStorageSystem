import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { fileApi, folderApi, aiApi } from '../services/api'
import FileCard from '../components/FileCard'
import ShareModal from '../components/ShareModal'
import FilePreviewModal from '../components/FilePreviewModal'
import AiSearchbar from '../components/AiSearchbar'
import { HiSearch, HiFolder, HiSparkles } from 'react-icons/hi'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchMode, setSearchMode] = useState('standard')
  
  const [shareFile, setShareFile] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)

  const doSearch = async (q, isAi = false) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    setSearchMode(isAi ? 'ai' : 'standard')
    try {
      if (isAi) {
        const filesRes = await aiApi.semanticSearch(q).then(r => r.data.data)
        setFiles(filesRes)
        setFolders([]) // Vector matching searches files only
      } else {
        const [filesRes, foldersRes] = await Promise.all([
          fileApi.search(q).then(r => r.data.data),
          folderApi.search(q).then(r => r.data.data)
        ])
        setFiles(filesRes)
        setFolders(foldersRes)
      }
    } catch {
      setFiles([])
      setFolders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery, false)
  }, [])

  const handleSearchTrigger = (q, isAi) => {
    setQuery(q)
    doSearch(q, isAi)
  }

  const total = files.length + folders.length

  return (
    <div className="space-y-6 animate-fade-in pb-12 pr-0">
      {/* Header with Searchbar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <HiSearch className="text-indigo-600 dark:text-indigo-400" /> Search System
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Search files and folders using keywords or AI semantic intent matching.
          </p>
        </div>
        <AiSearchbar onSearch={handleSearchTrigger} defaultValue={initialQuery} />
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 p-6 rounded-3xl">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Scanning repository...</span>
        </div>
      )}

      {!loading && searched && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            {searchMode === 'ai' && <HiSparkles className="text-purple-500 text-lg animate-pulse" />}
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {total} result{total !== 1 ? 's' : ''} found using {searchMode === 'ai' ? 'AI Semantic' : 'Standard Filename'} mode
            </p>
          </div>

          {total === 0 ? (
            <div className="p-16 rounded-3xl bg-white dark:bg-slate-900/40 border border-gray-250 dark:border-white/10 text-center text-slate-500 dark:text-slate-400 shadow-sm">
              <HiSearch className="text-6xl mx-auto mb-3 opacity-20 text-slate-450" />
              <p className="font-semibold text-xs">No matches found</p>
              <p className="text-[10px] text-slate-400 mt-1">Try another keyword or use AI semantic intent queries.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {folders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Folders ({folders.length})
                  </h3>
                  <div className="bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/10 rounded-3xl divide-y divide-gray-100 dark:divide-white/5 overflow-hidden shadow-sm">
                    {folders.map(folder => (
                      <div key={folder.id}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => navigate(`/files/folder/${folder.id}`)}>
                        <HiFolder className="text-2xl text-yellow-500" />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{folder.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Files ({files.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {files.map(file => (
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

      {!searched && (
        <div className="p-16 rounded-3xl bg-white dark:bg-slate-900/40 border border-gray-250 dark:border-white/10 text-center text-slate-500 dark:text-slate-400 shadow-sm">
          <HiSearch className="text-6xl mx-auto mb-3 opacity-20 text-slate-450" />
          <p className="font-semibold text-xs">Search your files</p>
          <p className="text-[10px] text-slate-450 mt-1">Enter a keyword or click the AI toggle to search by concept.</p>
        </div>
      )}

      {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}
