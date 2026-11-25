import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'
import { adminAuthAPI } from '@/lib/api-admin'
import {
  ADMIN_ACCESS_TOKEN,
  clearAdminAuthCookies,
  setAdminAuthTokens,
} from '@/lib/admin-auth-tokens'

/**
 * Session de la plateforme d'administration. Aucune notion de tenant ici : un
 * compte administrateur est transverse, et son état est stocké séparément de
 * `auth-storage` pour ne jamais interférer avec la session du dashboard client.
 */
const useAdminAuthStore = create(
  persist(
    (set, get) => ({
      admin: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null })

        try {
          const response = await adminAuthAPI.login(credentials)
          const { admin, tokens } = response.data

          setAdminAuthTokens(tokens)
          set({ admin, isAuthenticated: true, isLoading: false, error: null })

          return { success: true, data: response.data }
        } catch (error) {
          set({ isLoading: false, error: error.message, isAuthenticated: false })
          return { success: false, error: error.message, code: error.code }
        }
      },

      // L'acceptation d'une invitation ouvre directement la session, comme un login.
      acceptInvitation: async (data) => {
        set({ isLoading: true, error: null })

        try {
          const response = await adminAuthAPI.acceptInvitation(data)
          const { admin, tokens } = response.data

          setAdminAuthTokens(tokens)
          set({ admin, isAuthenticated: true, isLoading: false, error: null })

          return { success: true, data: response.data }
        } catch (error) {
          set({ isLoading: false, error: error.message, isAuthenticated: false })
          return { success: false, error: error.message, code: error.code }
        }
      },

      logout: async () => {
        set({ isLoading: true })

        try {
          await adminAuthAPI.logout()
        } catch (error) {
          console.warn('Erreur lors de la déconnexion:', error)
        } finally {
          clearAdminAuthCookies()
          set({ admin: null, isAuthenticated: false, isLoading: false, error: null })
        }
      },

      checkAuth: async () => {
        if (!Cookies.get(ADMIN_ACCESS_TOKEN)) {
          set({ isAuthenticated: false, isLoading: false, isInitialized: true })
          return
        }

        set({ isLoading: true })

        try {
          const response = await adminAuthAPI.getProfile()
          set({
            admin: response.data.admin,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            error: null,
          })
        } catch {
          clearAdminAuthCookies()
          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: null,
          })
        }
      },

      clearError: () => set({ error: null }),

      isSystemRole: () => Boolean(get().admin?.role?.isSystem),
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAdminAuthStore
