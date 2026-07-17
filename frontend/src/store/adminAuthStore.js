import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAdminAuthStore = create(
  persist(
    (set, get) => ({
      adminUser: null,
      adminAccessToken: null,
      adminRefreshToken: null,
      isAdminAuthenticated: false,

      adminLogin: async (email, password) => {
        const { data } = await api.post('/auth/admin/login', { email, password })
        if (data.success) {
          const { accessToken, refreshToken, user } = data.data
          set({ adminUser: user, adminAccessToken: accessToken, adminRefreshToken: refreshToken, isAdminAuthenticated: true })
          return user
        }
        throw new Error(data.message || 'Invalid Admin Credentials')
      },

      adminLogout: () => {
        set({ adminUser: null, adminAccessToken: null, adminRefreshToken: null, isAdminAuthenticated: false })
      }
    }),
    {
      name: 'cloud-storage-admin-auth',
      partialize: (state) => ({
        adminUser: state.adminUser,
        adminAccessToken: state.adminAccessToken,
        adminRefreshToken: state.adminRefreshToken,
        isAdminAuthenticated: state.isAdminAuthenticated
      })
    }
  )
)
