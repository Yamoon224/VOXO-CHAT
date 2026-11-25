import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useAuthStore from '../stores/auth-store'
import { useLocale } from 'next-intl'

// Hook pour l'authentification
export const useAuth = () => {
  const {
    user,
    tenant,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    verifyEmail,
    logout,
    deleteAccount,
    getProfile,
    updateProfile,
    updateTenant,
    changePassword,
    checkAuth,
    clearError,
    isOwner,
    isAdmin,
    isInitialized,
  } = useAuthStore()

  return {
    user,
    tenant,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    verifyEmail,
    logout,
    deleteAccount,
    getProfile,
    updateProfile,
    updateTenant,
    changePassword,
    checkAuth,
    clearError,
    isOwner,
    isAdmin,
    isInitialized,
  }
}

// Hook pour protéger les routes
export const useAuthGuard = (options = {}) => {
  const { requireAuth = true, requireRole = null, redirectTo = '/auth/login' } = options
  const { isAuthenticated, isLoading, isInitialized, user } = useAuth()
  const router = useRouter()
  const locale = useLocale()

  // L'initialisation est gérée par useAuthInit dans le layout racine
  // on ne rappelle pas checkAuth ici pour éviter les boucles infinies
  // si l'authentification échoue


  useEffect(() => {
    // Rediriger si l'authentification est requise mais l'utilisateur n'est pas connecté
    if (isInitialized && !isLoading && requireAuth && !isAuthenticated) {
      router.push(redirectTo)
      return
    }

    // Vérifier le rôle si nécessaire
    if (!isLoading && isAuthenticated && requireRole) {
      const hasRequiredRole = Array.isArray(requireRole) 
        ? requireRole.includes(user?.role)
        : user?.role === requireRole

      if (!hasRequiredRole) {
      router.push(`/${locale}/dashboard`)
        return
      }
    }
  }, [isInitialized, isLoading, requireAuth, isAuthenticated, requireRole, user?.role, router, redirectTo, locale])

  return {
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    user,
    isAuthorized: !requireRole || (requireRole && user && (
      Array.isArray(requireRole) ? requireRole.includes(user.role) : user.role === requireRole
    ))
  }
}

// Hook pour rediriger si déjà connecté
export const useGuestOnly = (redirectTo = '/dashboard') => {
  const { isAuthenticated, isLoading, isInitialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isInitialized, isAuthenticated, isLoading, router, redirectTo])

  return {
    isLoading: isLoading || !isInitialized,
    shouldRender: isInitialized && !isAuthenticated && !isLoading
  }

}

// Hook pour initialiser l'authentification
export const useAuthInit = () => {
  const { checkAuth, isLoading } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return { isLoading }
}
