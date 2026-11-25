import { z } from 'zod'

// Validation de mot de passe simplifiée
export const passwordValidation = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .refine(
    (password) => {
      const hasLower = /[a-z]/.test(password)
      const hasUpper = /[A-Z]/.test(password)
      const hasNumber = /\d/.test(password)
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>.,;:'"\-_+=~`|\\\/[\]]/.test(password)
      
      return hasLower && hasUpper && hasNumber && hasSpecial
    },
    {
      message: 'Le mot de passe doit contenir au moins : une minuscule, une majuscule, un chiffre et un caractère spécial',
    }
  )

// Schema de validation pour la connexion
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Email invalide'),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

export const createLoginSchema = (messages) => z.object({
  email: z
    .string()
    .min(1, messages.emailRequired)
    .email(messages.emailInvalid),
  password: z
    .string()
    .min(1, messages.passwordRequired)
    .min(6, messages.passwordMin),
})

// Sous-domaine, partagé par l'inscription et les réglages.
// Une chaîne vide vaut « aucun sous-domaine ».
export const subdomainSchema = z
  .string()
  .trim()
  .refine(
    val => val === '' || (val.length >= 3 && val.length <= 50 && /^[a-zA-Z0-9]+$/.test(val)),
    'Le sous-domaine doit contenir entre 3 et 50 caractères alphanumériques'
  )

// Site web de l'entreprise. Accepte le domaine nu (voxo.app) comme l'URL
// complète — exiger le protocole était un piège — et normalise avant envoi.
export const companyDomainSchema = z
  .string()
  .trim()
  .transform(val => (val === '' ? '' : (/^https?:\/\//i.test(val) ? val : `https://${val}`)))
  .refine(
    val => val === '' || z.string().url().safeParse(val).success,
    'Indiquez un site web valide, par exemple voxo.app'
  )

// Réglages > Entreprise. Une chaîne vide vaut « effacer le champ » côté backend.
export const companySettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères')
    .max(255, 'Le nom de l\'entreprise ne peut pas dépasser 255 caractères'),

  domain: companyDomainSchema,

  subdomain: subdomainSchema,
})

// Schema de validation pour l'inscription
export const registerSchema = z.object({
  // Informations entreprise
  companyName: z
    .string()
    .min(1, 'Le nom de l\'entreprise est requis')
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  
  // `domain` n'est plus demandé à l'inscription : il se renseigne dans
  // Réglages > Entreprise via companyDomainSchema.

  subdomain: subdomainSchema,

  subscriptionPlan: z
    .enum(['free', 'basic', 'pro', 'enterprise'])
    .default('free'),

  // Informations utilisateur
  firstName: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),
  
  lastName: z
    .string()
    .min(1, 'Le nom est requis')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Email invalide'),
  
  password: passwordValidation,
  
  confirmPassword: z
    .string()
    .min(1, 'Veuillez confirmer votre mot de passe'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

// Schema pour la mise à jour du profil
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),
  
  lastName: z
    .string()
    .min(1, 'Le nom est requis')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Email invalide'),
})

export const acceptInvitationSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis').max(50),
  lastName: z.string().trim().min(1, 'Le nom est requis').max(50),
  password: passwordValidation,
  confirmPassword: z.string().min(1, 'La confirmation est requise'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

// Schema pour le changement de mot de passe
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Le mot de passe actuel est requis'),
  
  newPassword: passwordValidation,
  
  confirmNewPassword: z
    .string()
    .min(1, 'Veuillez confirmer le nouveau mot de passe'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Les nouveaux mots de passe ne correspondent pas',
  path: ['confirmNewPassword'],
})

// Schema pour l'oubli de mot de passe
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Email invalide'),
})

export const createForgotPasswordSchema = messages => z.object({
  email: z.string().min(1, messages.emailRequired).email(messages.emailInvalid),
})

// Schema pour la réinitialisation via le lien reçu par email
export const resetPasswordSchema = z.object({
  newPassword: passwordValidation,

  confirmNewPassword: z
    .string()
    .min(1, 'Veuillez confirmer le nouveau mot de passe'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmNewPassword'],
})

export const createResetPasswordSchema = messages => {
  const password = z.string().min(8, messages.passwordRules).refine(value => (
    /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z\d]/.test(value)
  ), messages.passwordRules)
  return z.object({
    newPassword: password,
    confirmNewPassword: z.string().min(1, messages.confirmationRequired),
  }).refine(data => data.newPassword === data.confirmNewPassword, {
    message: messages.passwordMismatch,
    path: ['confirmNewPassword'],
  })
}

// Schema pour créer une connaissance
export const createKnowledgeSchema = z.object({
  title: z
    .string()
    .min(1, 'Le titre est requis')
    .max(500, 'Le titre ne peut pas dépasser 500 caractères'),
  
  content: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(10000, 'Le contenu ne peut pas dépasser 10000 caractères'),
  
  sourceType: z
    .enum(['manual', 'upload', 'url', 'api'])
    .default('manual'),
  
  sourceUrl: z
    .string()
    .url('URL invalide')
    .optional()
    .or(z.literal('')),
  
  tags: z
    .array(z.string().max(50))
    .max(10, 'Maximum 10 tags autorisés')
    .default([]),
  
  isActive: z
    .boolean()
    .default(true),
})

// Schema pour envoyer un message de chat
export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Le message ne peut pas être vide')
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères'),
  
  sessionId: z
    .string()
    .uuid()
    .optional(),
  
  userId: z
    .string()
    .optional(),
})

// Helper pour valider les données
export const validateData = (schema, data) => {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData, errors: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {}
      error.errors.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      return { success: false, data: null, errors }
    }
    return { success: false, data: null, errors: { general: error.message } }
  }
}

// Types d'erreurs pour les formulaires
export const getFieldError = (errors, fieldName) => {
  return errors?.[fieldName] || null
}

export const hasFieldError = (errors, fieldName) => {
  return Boolean(errors?.[fieldName])
}
