import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'
import { authAPI } from '../lib/api'
import { setAuthTokens, setTenantCookie, clearAuthCookies } from '../lib/auth-tokens'
import { createProfileActions } from './auth-profile-actions'

const useAuthStore = create(
  persist(
    (set, get) => ({
      ...createProfileActions(set),

      // État initial
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      // Actions
      // Inscription
      // L'inscription ne connecte plus : l'adresse doit d'abord être confirmée.
      register: async (userData) => {
        set({ isLoading: true, error: null })

        try {
          const response = await authAPI.register(userData)

          set({
            isLoading: false,
            isAuthenticated: false,
            error: null,
          })

          return { success: true, data: response.data }
        } catch (error) {
          set({
            isLoading: false,
            error: error.message,
            isAuthenticated: false,
          })
          // Le code et les conflits permettent à l'appelant d'orienter
          // l'utilisateur (renvoi du lien, retour sur le champ fautif).
          return {
            success: false,
            error: error.message,
            code: error.code,
            details: error.details,
          }
        }
      },

      // Confirmation d'adresse : ouvre la session comme un login.
      verifyEmail: async (token) => {
        set({ isLoading: true, error: null })

        try {
          const response = await authAPI.verifyEmail(token)
          const { user, tenant, tokens } = response.data

          setAuthTokens(tokens)
          setTenantCookie(tenant.id)

          set({
            user,
            tenant,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          return { success: true, data: response.data }
        } catch (error) {
          set({
            isLoading: false,
            error: error.message,
            isAuthenticated: false,
          })
          return { success: false, error: error.message, code: error.code }
        }
      },

      // Connexion
      login: async (credentials) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authAPI.login(credentials)
          const { user, tenant, tokens } = response.data

          // Sauvegarder les tokens dans les cookies
          setAuthTokens(tokens)
          setTenantCookie(tenant.id)

          set({
            user,
            tenant,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          return { success: true, data: response.data }
        } catch (error) {
          set({
            isLoading: false,
            error: error.message,
            isAuthenticated: false,
          })
          // `code` porte EMAIL_NOT_VERIFIED, que l'UI traite différemment
          // d'une erreur d'identifiants.
          return { success: false, error: error.message, code: error.code }
        }
      },

      // Déconnexion
      logout: async () => {
        set({ isLoading: true })
        
        try {
          await authAPI.logout()
        } catch (error) {
          console.warn('Erreur lors de la déconnexion:', error)
        } finally {
          // Nettoyer les cookies et le state
          clearAuthCookies()
          
          set({
            user: null,
            tenant: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      // Supprimer son propre compte (soft delete, purge à 30 jours) puis
      // effacer la session locale. Le backend décide seul si l'entreprise part
      // avec : `newOwnerId` ou `confirmCompanyDeletion` selon le cas.
      deleteAccount: async ({ currentPassword, newOwnerId, confirmCompanyDeletion } = {}) => {
        set({ isLoading: true, error: null })

        try {
          await authAPI.deleteAccount({ currentPassword, newOwnerId, confirmCompanyDeletion })
          clearAuthCookies()
          set({
            user: null,
            tenant: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: null,
          })
          return { success: true }
        } catch (error) {
          set({ isLoading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      // Vérifier l'authentification au chargement
      checkAuth: async () => {
        const token = Cookies.get('accessToken')
        const tenantId = Cookies.get('tenantId')
        
        if (!token || !tenantId) {
          set({ isAuthenticated: false, isLoading: false, isInitialized: true })
          return
        }

        set({ isLoading: true })
        
        try {
          const response = await authAPI.getProfile()
          const { user, tenant } = response.data

          set({
            user,
            tenant,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            error: null,
          })

        } catch {
          // Token invalide, nettoyer
          clearAuthCookies()
          
          set({
            user: null,
            tenant: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: null,
          })
        }
      },

      // Nettoyer les erreurs
      clearError: () => {
        set({ error: null })
      },

      // Helpers
      isOwner: () => {
        const { user } = get()
        return user?.role === 'owner'
      },

      isAdmin: () => {
        const { user } = get()
        return user?.role === 'owner' || user?.role === 'admin'
      },

      getTenant: () => {
        const { tenant } = get()
        return tenant
      },

      getUser: () => {
        const { user } = get()
        return user
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore
