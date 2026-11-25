'use client'

import {
  MessageSquare, TestTube, User, Building2,
} from 'lucide-react'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'

// Un seul endroit décrit les onglets : le déclencheur et son contenu ne
// peuvent plus diverger.
//
// Équipe, Facturation, Canaux puis Intégration sont devenus des pages de la
// barre latérale.
const TABS = [
  { value: 'chatbot', icon: MessageSquare },
  { value: 'testing', icon: TestTube },
  { value: 'profile', icon: User },
  { value: 'company', icon: Building2 },
]

// Idem : une classe par nombre d'onglets, aucune interpolation.
const COLUMNS = {
  1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6', 7: 'lg:grid-cols-7', 8: 'lg:grid-cols-8',
}

export function SettingsTabsList({ isVisible }) {
  const t = useTranslations('SettingsPage')
  const tabs = TABS.filter(tab => isVisible(tab.value))

  return (
    <TabsList
      className={`grid w-full grid-cols-2 gap-1 bg-gray-100 sm:grid-cols-3 ${COLUMNS[tabs.length] || 'lg:grid-cols-7'}`}
    >
      {tabs.map(({ value, icon: Icon }) => (
        <TabsTrigger key={value} value={value}>
          <Icon className="h-4 w-4 mr-2" />
          {t(`tabs.${value}`)}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
