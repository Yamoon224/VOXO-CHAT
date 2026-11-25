const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function getPublicPlans() {
  const response = await fetch(`${API_URL}/public/plans`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Les tarifs sont indisponibles pour le moment.')
  const body = await response.json()
  return Array.isArray(body.data?.plans) ? body.data.plans : []
}
