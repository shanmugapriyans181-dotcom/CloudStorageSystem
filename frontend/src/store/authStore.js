import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (usernameOrEmail, password) => {
        const { data } = await api.post('/auth/login', { usernameOrEmail, password })
        const { accessToken, refreshToken, user } = data.data
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        set({ user, accessToken, refreshToken, isAuthenticated: true })
        return user
      },

      register: async (username, email, password, fullName) => {
        const { data } = await api.post('/auth/register', { username, email, password, fullName })
        const { accessToken, refreshToken, user } = data.data
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        set({ user, accessToken, refreshToken, isAuthenticated: true })
        return user
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch (e) {
          // ignore
        }
        delete api.defaults.headers.common['Authorization']
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      updateUser: (updatedUser) => set({ user: updatedUser }),

      initAuth: () => {
        const { accessToken } = get()
        if (accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        }
      }
    }),
    {
      name: 'cloud-storage-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
