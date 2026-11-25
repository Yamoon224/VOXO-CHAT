'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useAdminAuthStore from '@/stores/admin-auth-store'
import { useLocale } from 'next-intl'

export const useAdminAuth = () => {
  const admin = useAdminAuthStore(state => state.admin)
  const isAuthenticated = useAdminAuthStore(state => state.isAuthenticated)
  const isLoading = useAdminAuthStore(state => state.isLoading)
  const isInitialized = useAdminAuthStore(state => state.isInitialized)
  const error = useAdminAuthStore(state => state.error)
  const login = useAdminAuthStore(state => state.login)
  const acceptInvitation = useAdminAuthStore(state => state.acceptInvitation)
  const logout = useAdminAuthStore(state => state.logout)
  const checkAuth = useAdminAuthStore(state => state.checkAuth)
  const clearError = useAdminAuthStore(state => state.clearError)

  return {
    admin,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    login,
    acceptInvitation,
    logout,
    checkAuth,
    clearError,
    isSystemRole: Boolean(admin?.role?.isSystem),
  }
}

/**
 * Protection des routes d'administration.
 *
 * `requireSystemRole` réserve un écran au super administrateur (définition des
 * rôles). Comme côté tenant, on attend `isInitialized` avant toute redirection
 * pour ne pas éjecter l'utilisateur avant la fin du `checkAuth()` initial.
 */
export const useAdminAuthGuard = (options = {}) => {
  const {
    requireAuth = true,
    requireSystemRole = false,
    redirectTo = '/admin/auth/login',
  } = options
  const { isAuthenticated, isLoading, isInitialized, isSystemRole } = useAdminAuth()
  const router = useRouter()
  const locale = useLocale()

  useEffect(() => {
    if (!isInitialized || isLoading) return

    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo)
      return
    }

    if (isAuthenticated && requireSystemRole && !isSystemRole) {
      router.push(`/${locale}/admin/accounts`)
    }
  }, [isInitialized, isLoading, requireAuth, isAuthenticated, requireSystemRole, isSystemRole, router, redirectTo, locale])

  return {
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    isAuthorized: isAuthenticated && (!requireSystemRole || isSystemRole),
  }
}

export const useAdminGuestOnly = (redirectTo = '/admin/accounts') => {
  const { isAuthenticated, isLoading, isInitialized } = useAdminAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isInitialized, isAuthenticated, isLoading, router, redirectTo])

  return {
    isLoading: isLoading || !isInitialized,
    shouldRender: isInitialized && !isAuthenticated && !isLoading,
  }
}

export const useAdminAuthInit = () => {
  const checkAuth = useAdminAuthStore(state => state.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])
}
