'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { clearOneSignalIdentity, setOneSignalIdentity } from '@/lib/onesignal'

export function OneSignalIdentity({ admin = false }) {
  const userAuth = useAuth()
  const adminAuth = useAdminAuth()
  const identity = admin ? (adminAuth.isAuthenticated && adminAuth.admin ? `admin:${adminAuth.admin.id}` : null) : (userAuth.isAuthenticated && userAuth.user ? `user:${userAuth.user.id}` : null)
  useEffect(() => {
    if (identity) setOneSignalIdentity(identity).catch(() => {})
    else clearOneSignalIdentity().catch(() => {})
  }, [identity])
  return null
}
