// Traduit un échec d'inscription en actions d'interface. Isolé du hook pour
// que l'ajout d'un nouveau code métier ne touche pas au reste du formulaire.

// Un compte non confirmé n'est pas une inscription à corriger : l'utilisateur
// doit récupérer celui qui existe, pas en créer un autre.
const PENDING_VERIFICATION = 'EMAIL_PENDING_VERIFICATION'

function buildVerifyRedirect(email, locale) {
  const params = new URLSearchParams({ email, pending: '1' })
  return `/${locale}/auth/verify-email?${params.toString()}`
}

/**
 * Normalise la réponse d'échec du store en un plan d'action.
 *
 * Le backend renvoie `details.conflicts` quand plusieurs champs sont en cause ;
 * on retombe sur le code principal quand ce détail est absent (erreur réseau,
 * ancienne version de l'API).
 *
 * @param {(key: string) => string} t - fonction de traduction (namespace `Register`)
 * @returns {{ fieldErrors: Array<{name: string, message: string}>,
 *             redirect: string|null,
 *             toast: {type: 'error'|'info', message: string}|null }}
 */
export function resolveRegisterConflict(result, email, locale, t) {
  const conflicts = result.details?.conflicts?.length
    ? result.details.conflicts
    : [{ field: null, code: result.code, message: result.error }]

  // Tous les champs fautifs sont marqués, y compris ceux d'une étape non
  // affichée : l'utilisateur les verra en revenant en arrière.
  const fieldErrors = conflicts
    .filter((conflict) => conflict.field)
    .map((conflict) => ({ name: conflict.field, message: conflict.message }))

  const pending = conflicts.find((conflict) => conflict.code === PENDING_VERIFICATION)

  if (pending) {
    return {
      fieldErrors,
      redirect: buildVerifyRedirect(email, locale),
      toast: {
        type: 'info',
        message: t('pendingConfirmationToast'),
      },
    }
  }

  return {
    fieldErrors,
    redirect: null,
    toast: { type: 'error', message: result.error },
  }
}
