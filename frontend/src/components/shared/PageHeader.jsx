'use client'

import { createContext, useContext, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Permet à une page de déposer ses contrôles dans l'en-tête de la coquille.
 *
 * La maquette place la période et les actions tout en haut, à côté du compte,
 * pas dans le corps de la page. Or l'en-tête est rendu par le layout, au-dessus
 * des pages : il faut donc un passage du bas vers le haut.
 *
 * C'est un PORTAIL et non un état partagé : recopier les enfants dans un état
 * du provider boucherait à l'infini, `children` étant un objet neuf à chaque
 * rendu. Le portail laisse le contenu dans l'arbre React de la page — ses
 * gestionnaires et son état continuent de fonctionner normalement — tout en le
 * projetant dans le DOM de l'en-tête.
 *
 * Partagé par les deux coquilles, `/admin` et `/dashboard` : chacune monte son
 * propre provider, les deux arbres ne se voient donc jamais.
 */
const HeaderSlotContext = createContext({ container: null, setContainer: () => {} })

export function HeaderSlotProvider({ children }) {
  // `setContainer` vient de `useState` : son identité est stable, React ne
  // rappellera donc pas la ref à chaque rendu.
  const [container, setContainer] = useState(null)

  return (
    <HeaderSlotContext.Provider value={{ container, setContainer }}>
      {children}
    </HeaderSlotContext.Provider>
  )
}

export function useHeaderSlot() {
  return useContext(HeaderSlotContext)
}

/** En-tête de page : titre, sous-titre, et contrôles projetés dans la barre du haut. */
export function PageHeader({ title, description, children }) {
  const { container } = useHeaderSlot()

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {children && container && createPortal(children, container)}
    </div>
  )
}
