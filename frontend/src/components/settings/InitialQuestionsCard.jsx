import { MessageSquare } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'

export function InitialQuestionsCard({ questions = [], updateSetting, path = 'initialQuestions', locale = 'FR' }) {
  const t = useTranslations('ChatbotSettings')
  const updateQuestion = (index, value) => {
    const updated = [...questions]
    updated[index] = value
    updateSetting(path, updated)
  }

  const removeQuestion = index => {
    updateSetting(path, questions.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="flex items-center"><MessageSquare className="mr-2 h-5 w-5" />{t('initialQuestions')} · {locale}</CardTitle>
        <CardDescription>{t('initialQuestionsDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((question, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
            <Input value={question} onChange={event => updateQuestion(index, event.target.value)} placeholder={t('questionPlaceholder', { number: index + 1 })} />
            <Button variant="ghost" size="sm" aria-label={t('removeQuestion', { number: index + 1 })} className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => removeQuestion(index)}>✕</Button>
          </div>
        ))}
        {questions.length < 5 && (
          <Button variant="outline" className="w-full border-dashed" onClick={() => updateSetting(path, [...questions, ''])}>+ {t('addQuestion')}</Button>
        )}
        <Alert>
          <AlertDescription className="text-sm text-gray-600"><strong>💡 {t('tip')}:</strong> {t('questionsTip')}</AlertDescription>
        </Alert>
      </CardContent>
    </SurfaceCard>
  )
}
