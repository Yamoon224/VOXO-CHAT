import { useTranslations } from 'next-intl'
import { CheckCircle } from 'lucide-react'

export function StepIndicator({ currentStep }) {
  const t = useTranslations('Register')
  return (
    <div className="flex justify-center items-center space-x-4">
      <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
          currentStep >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'
        }`}>
          {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
        </div>
        <span className="ml-2 text-sm font-medium">{t('stepCompany')}</span>
      </div>
      <div className={`w-8 h-px ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
      <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
          currentStep >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'
        }`}>
          2
        </div>
        <span className="ml-2 text-sm font-medium">{t('stepAccount')}</span>
      </div>
    </div>
  )
}
