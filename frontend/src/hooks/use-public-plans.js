'use client'

import { useEffect, useState } from 'react'
import { getPublicPlans } from '@/lib/public-plans.mjs'

export function usePublicPlans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getPublicPlans().then((value) => {
      if (active) setPlans(value)
    }).catch(() => {
      // La grille conserve son état de chargement neutre si l'API est indisponible.
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  return { plans, loading }
}
