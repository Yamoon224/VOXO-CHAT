import { Bot, LockKeyhole } from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MAX_LENGTH = 2000

export function CustomAiInstructionsCard({ settings, updateSetting, enabled, readOnly = false }) {
  const value = settings.customInstructions || ''
  const disabled = readOnly || !enabled

  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Instructions metier de l&apos;IA</CardTitle>
        <CardDescription>
          Precisez le contexte de votre activite, le ton et les priorites de reponse de votre assistant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!enabled && (
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Cette fonctionnalite est disponible avec votre forfait Pro ou Entreprise. Les instructions deja enregistrees restent conservees, mais ne sont pas utilisees tant que le forfait ne l&apos;inclut pas.</p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="custom-ai-instructions">Consignes personnalisees</Label>
          <Textarea
            id="custom-ai-instructions"
            value={value}
            onChange={(event) => updateSetting('customInstructions', event.target.value.slice(0, MAX_LENGTH))}
            disabled={disabled}
            maxLength={MAX_LENGTH}
            rows={8}
            placeholder="Exemple : Nous sommes une boutique de mobilier sur mesure. Mettez en avant l'accompagnement et invitez les visiteurs a demander un devis lorsqu'un produit n'est pas documente."
            aria-describedby="custom-ai-instructions-help"
          />
          <p id="custom-ai-instructions-help" className="text-xs text-muted-foreground">
            {value.length}/{MAX_LENGTH} caracteres. Ces consignes ne peuvent pas modifier les regles de securite, inventer des informations, acceder a de nouvelles donnees ni activer des actions.
          </p>
        </div>
      </CardContent>
    </SurfaceCard>
  )
}
