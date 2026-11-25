import { authAPI, tenantAPI } from '@/lib/api'

/**
 * Actions du store auth liées au profil de l'utilisateur connecté et aux
 * informations de son entreprise.
 * Extrait de auth-store.js pour tenir la limite de 250 lignes par fichier.
 */
export const createProfileActions = (set) => ({
  // Récupérer le profil utilisateur
  getProfile: async () => {
    set({ isLoading: true })

    try {
      const response = await authAPI.getProfile()
      const { user, tenant } = response.data

      set({ user, tenant, isAuthenticated: true, isLoading: false, error: null })

      return { success: true, data: response.data }
    } catch (error) {
      set({ isLoading: false, error: error.message })
      return { success: false, error: error.message }
    }
  },

  // Mettre à jour le profil. Un changement d'email n'est pas immédiat :
  // la réponse porte `emailChangePending` tant que le lien n'est pas confirmé.
  updateProfile: async (userData) => {
    set({ isLoading: true, error: null })

    try {
      const response = await authAPI.updateProfile(userData)

      set({ user: response.data, isLoading: false, error: null })

      return { success: true, data: response.data }
    } catch (error) {
      set({ isLoading: false, error: error.message })
      return { success: false, error: error.message }
    }
  },

  // Enregistrer les informations de l'entreprise. Le tenant du store est
  // rafraîchi avec la réponse serveur, qui fait autorité (champs normalisés).
  updateTenant: async (settings) => {
    set({ isLoading: true, error: null })

    try {
      const response = await tenantAPI.updateSettings(settings)

      set((state) => ({
        tenant: { ...state.tenant, ...response.data },
        isLoading: false,
        error: null,
      }))

      return { success: true, data: response.data }
    } catch (error) {
      set({ isLoading: false, error: error.message })
      return { success: false, error: error.message }
    }
  },

  // Changer le mot de passe
  changePassword: async (passwordData) => {
    set({ isLoading: true, error: null })

    try {
      await authAPI.changePassword(passwordData)

      set({ isLoading: false, error: null })

      return { success: true }
    } catch (error) {
      set({ isLoading: false, error: error.message })
      return { success: false, error: error.message }
    }
  },
})
