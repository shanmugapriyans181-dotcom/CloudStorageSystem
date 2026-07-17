import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useQuery } from 'react-query'
import { fileApi } from '../services/api'
import api from '../services/api'
import { toast } from 'react-toastify'
import { HiUser, HiLockClosed, HiDatabase } from 'react-icons/hi'
import { format } from 'date-fns'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ['B','KB','MB','GB','TB'][i]
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [uploadingPic, setUploadingPic] = useState(false)

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    username: user?.username || ''
  })

  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const { data: dashboard } = useQuery('dashboard', () =>
    fileApi.getDashboard().then(r => r.data.data))

  const handlePictureChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setUploadingPic(true)
    try {
      const { data } = await api.post('/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      updateUser(data.data)
      toast.success('Profile picture updated successfully!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to upload profile picture')
    } finally {
      setUploadingPic(false)
    }
  }

  const handleDeletePicture = async () => {
    if (!window.confirm("Are you sure you want to delete your profile picture?")) return
    setUploadingPic(true)
    try {
      const { data } = await api.delete('/users/profile-picture')
      updateUser(data.data)
      toast.success('Profile picture deleted successfully!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete profile picture')
    } finally {
      setUploadingPic(false)
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.put('/users/profile', profileForm)
      updateUser(data.data)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (pwdForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      })
      toast.success('Password changed')
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      toast.error('Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const pct = dashboard ? Math.min(dashboard.usagePercentage, 100) : 0

  const hasProfilePic = user?.profilePicture && user.profilePicture !== 'null' && user.profilePicture.trim() !== ''

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Profile Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and security settings
        </p>
      </div>

      {/* Avatar + info */}
      <div className="card p-6 flex items-center gap-5">
        <div className="relative group cursor-pointer shrink-0">
          <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center
                          text-white text-2xl font-bold overflow-hidden border-2 border-white dark:border-gray-800 shadow-md">
            {hasProfilePic ? (
              <img
                src={
                  user.profilePicture.startsWith('http://') || user.profilePicture.startsWith('https://')
                    ? user.profilePicture
                    : `/api/users/profile-picture/view/${user.profilePicture}`
                }
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              user?.username?.charAt(0).toUpperCase()
            )}
          </div>
          {/* Hover overlay with input */}
          <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
            <span className="text-white text-[10px] font-bold uppercase tracking-wider">Edit</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePictureChange}
              disabled={uploadingPic}
            />
          </label>
          {uploadingPic && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div>
          <p className="text-lg font-semibold dark:text-white">{user?.fullName || user?.username}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`inline-flex px-2 py-0.5 text-xs rounded font-medium ${
              user?.role === 'ADMIN'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
            }`}>
              {user?.role}
            </span>
            {hasProfilePic && (
              <button
                onClick={handleDeletePicture}
                disabled={uploadingPic}
                className="text-xs text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300 font-bold hover:underline"
              >
                Delete Photo
              </button>
            )}
          </div>
        </div>
        <div className="ml-auto text-right text-sm text-gray-400">
          <p>Member since</p>
          <p className="dark:text-gray-300">
            {user?.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : '—'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {[
          { key: 'profile', label: 'Profile', icon: HiUser },
          { key: 'security', label: 'Security', icon: HiLockClosed },
          { key: 'storage', label: 'Storage', icon: HiDatabase },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}>
            <Icon className="text-base" />{label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="card p-6">
          <h2 className="font-semibold dark:text-white mb-4">Personal Information</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={profileForm.username}
                onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input type="email" value={user?.email} disabled className="input-field opacity-60 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <div className="card p-6">
          <h2 className="font-semibold dark:text-white mb-4">Change Password</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={pwdForm.currentPassword}
                onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={pwdForm.newPassword}
                onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={pwdForm.confirmPassword}
                onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                className="input-field"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* Storage tab */}
      {activeTab === 'storage' && dashboard && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold dark:text-white">Storage Usage</h2>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                {formatBytes(dashboard.storageUsed)} used
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {formatBytes(dashboard.totalStorageQuota)} total
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-primary-600'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {formatBytes(dashboard.storageAvailable)} available
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(dashboard.fileCountByType || {}).map(([type, count]) => (
              <div key={type} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{type}</p>
                <p className="text-lg font-bold dark:text-white">{count}</p>
                <p className="text-xs text-gray-400">{formatBytes(dashboard.storageByType?.[type])}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
