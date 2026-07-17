import axios from 'axios'
import { toast } from 'react-toastify'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// Attach token before each request
api.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('/admin')) {
    const storedAdmin = localStorage.getItem('cloud-storage-admin-auth')
    if (storedAdmin) {
      try {
        const { state } = JSON.parse(storedAdmin)
        if (state?.adminAccessToken) {
          config.headers.Authorization = `Bearer ${state.adminAccessToken}`
        }
      } catch (e) {
        // ignore
      }
    }
  } else {
    const stored = localStorage.getItem('cloud-storage-auth')
    if (stored) {
      try {
        const { state } = JSON.parse(stored)
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`
        }
      } catch (e) {
        // ignore
      }
    }
  }
  return config
})

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/admin/login')) {
        const msg = error.response?.data?.message || 'Authentication failed'
        toast.error(msg)
        return Promise.reject(error)
      }
      if (url.startsWith('/admin')) {
        localStorage.removeItem('cloud-storage-admin-auth')
        window.location.href = '/admin'
      } else {
        localStorage.removeItem('cloud-storage-auth')
        window.location.href = '/login'
      }
    } else if (error.response && error.response.status !== 404) {
      const msg = error.response.data?.message || 'Something went wrong'
      toast.error(msg)
    }
    return Promise.reject(error)
  }
)

export const fileApi = {
  upload: (formData, onProgress, params = {}) =>
    api.post('/files/upload', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0, // Disable timeout for uploads to support large files (MP4, PDF etc.)
      onUploadProgress: (e) => {
        const percent = Math.round((e.loaded * 100) / e.total)
        onProgress?.(percent)
      }
    }),
  getFiles: (folderId) =>
    api.get('/files', { params: { folderId } }),
  getRecent: (limit = 10) =>
    api.get('/files/recent', { params: { limit } }),
  search: (q) =>
    api.get('/files/search', { params: { q } }),
  filter: (type) =>
    api.get('/files/filter', { params: { type } }),
  download: (id) =>
    api.get(`/files/download/${id}`, { responseType: 'blob' }),
  rename: (id, name) =>
    api.patch(`/files/${id}/rename`, null, { params: { name } }),
  trash: (id) =>
    api.delete(`/files/${id}`),
  restore: (id) =>
    api.post(`/files/${id}/restore`),
  permanentDelete: (id) =>
    api.delete(`/files/${id}/permanent`),
  getTrash: () =>
    api.get('/files/trash'),
  getDashboard: () =>
    api.get('/files/dashboard'),
  shareFile: (payload) =>
    api.post('/files/share', payload),
  getSharedWithMe: () =>
    api.get('/files/shared/with-me'),
  getSharedByMe: () =>
    api.get('/files/shared/by-me'),
  revokeShare: (shareId) =>
    api.delete(`/files/share/${shareId}`)
}

export const authApi = {
  getGoogleClientId: () =>
    api.get('/auth/google/client-id'),
  googleLogin: (idToken) =>
    api.post('/auth/google/login', { idToken }),
  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (payload) =>
    api.post('/auth/reset-password', payload)
}

export const folderApi = {
  create: (name, parentId, color) =>
    api.post('/folders', { name, parentId, color }),
  getRoots: () =>
    api.get('/folders'),
  getFolder: (id) =>
    api.get(`/folders/${id}`),
  getSubFolders: (id) =>
    api.get(`/folders/${id}/subfolders`),
  rename: (id, name) =>
    api.patch(`/folders/${id}/rename`, null, { params: { name } }),
  trash: (id) =>
    api.delete(`/folders/${id}`),
  restore: (id) =>
    api.post(`/folders/${id}/restore`),
  permanentDelete: (id) =>
    api.delete(`/folders/${id}/permanent`),
  getTrash: () =>
    api.get('/folders/trash'),
  search: (q) =>
    api.get('/folders/search', { params: { q } })
}

export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  toggleActive: (id) => api.patch(`/admin/users/${id}/toggle-active`),
  updateQuota: (id, quotaBytes) =>
    api.patch(`/admin/users/${id}/storage-quota`, null, { params: { quotaBytes } }),
  getLogs: (page = 0, size = 20) =>
    api.get('/admin/logs', { params: { page, size } }),
  getAnalytics: () => api.get('/admin/analytics'),
  searchUsers: (q) => api.get('/admin/users/search', { params: { q } })
}

export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (fullName, username) => api.put('/users/profile', { fullName, username }),
  getActivity: () => api.get('/users/activity'),
  upgradePlan: (plan) => api.post('/users/upgrade', null, { params: { plan } })
}

export const favoriteApi = {
  getFavorites: () => api.get('/favorites'),
  add: (fileId) => api.post(`/favorites/${fileId}`),
  remove: (fileId) => api.delete(`/favorites/${fileId}`)
}

export const notificationApi = {
  getNotifications: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all')
}

export const aiApi = {
  ask: (fileId, question, history = []) => api.post('/ai/ask', { fileId: String(fileId), question, history }, { timeout: 0 }),
  semanticSearch: (query) => api.get('/ai/search', { params: { query } }, { timeout: 60000 }),
  getMetadata: (fileId) => api.get(`/ai/metadata/${fileId}`)
}

export default api
