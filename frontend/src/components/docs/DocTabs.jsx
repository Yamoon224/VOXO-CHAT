'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Onglets de documentation : liste déclarative (`items`) plutôt que du JSX
 * `TabsTrigger`/`TabsContent` répété à chaque page.
 */
export function DocTabs({ items, defaultValue }) {
  return (
    <Tabs defaultValue={defaultValue ?? items[0]?.value} className="w-full">
      <TabsList>
        {items.map(item => (
          <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>
        ))}
      </TabsList>
      {items.map(item => (
        <TabsContent key={item.value} value={item.value} className="pt-3">
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
