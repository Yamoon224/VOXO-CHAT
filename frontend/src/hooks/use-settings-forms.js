import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { updateProfileSchema, companySettingsSchema } from '@/lib/validations'

export function useSettingsForms(user, tenant, updateProfile, updateTenant) {
  const { toast } = useToast()
  const [profileSaving, setProfileSaving] = useState(false)
  const [companySaving, setCompanySaving] = useState(false)
  const [profileSettings, setProfileSettings] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  })
  const [companySettings, setCompanySettings] = useState({
    name: tenant?.name || '',
    domain: tenant?.domain || '',
    subdomain: tenant?.subdomain || '',
  })

  useEffect(() => {
    if (user) setProfileSettings({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
    })
  }, [user])

  useEffect(() => {
    if (tenant) setCompanySettings({
      name: tenant.name || '',
      domain: tenant.domain || '',
      subdomain: tenant.subdomain || '',
    })
  }, [tenant])

  const handleSaveProfile = async () => {
    const validation = updateProfileSchema.safeParse(profileSettings)
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || 'Profil invalide')
      return
    }
    setProfileSaving(true)
    const result = await updateProfile(validation.data)
    setProfileSaving(false)
    if (result.success) toast.success('Profil mis à jour')
    else toast.error(result.error || 'Impossible de mettre à jour le profil')
  }

  const handleSaveCompany = async () => {
    const validation = companySettingsSchema.safeParse(companySettings)
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || 'Paramètres invalides')
      return
    }

    setCompanySaving(true)
    const result = await updateTenant(validation.data)
    setCompanySaving(false)

    if (!result.success) {
      toast.error(result.error || 'Impossible d’enregistrer les paramètres')
      return
    }
    // Le serveur fait autorité : on réaffiche ce qu'il a réellement enregistré.
    setCompanySettings({
      name: result.data.name || '',
      domain: result.data.domain || '',
      subdomain: result.data.subdomain || '',
    })
    toast.success('Paramètres de l’entreprise mis à jour')
  }

  return {
    profileSettings,
    setProfileSettings,
    profileSaving,
    companySettings,
    setCompanySettings,
    companySaving,
    handleSaveProfile,
    handleSaveCompany,
  }
}
