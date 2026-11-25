Structure Frontend Chatbot SaaS
Architecture des Dossiers

frontend/
├── README.md
├── next.config.js
├── tailwind.config.js
├── package.json
├── .env.local
├── .env.example
├── public/
│   ├── icons/
│   ├── images/
│   └── favicon.ico
├── src/
│   ├── app/                      # App Router Next.js 15
│   │   ├── (auth)/              # Groupe de routes d'authentification
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/         # Groupe de routes dashboard
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx                    # Vue d'ensemble
│   │   │   │   ├── conversations/
│   │   │   │   │   ├── page.tsx                # Liste conversations
│   │   │   │   │   └── [sessionId]/
│   │   │   │   │       └── page.tsx            # Détail conversation
│   │   │   │   ├── knowledge/
│   │   │   │   │   ├── page.tsx                # Base de connaissances
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx            # Ajouter connaissance
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx            # Éditer connaissance
│   │   │   │   ├── appearance/
│   │   │   │   │   └── page.tsx                # Personnalisation
│   │   │   │   ├── integration/
│   │   │   │   │   └── page.tsx                # Code d'intégration
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx                # Paramètres
│   │   │   ├── admin/           # Dashboard Admin (multi-tenant)
│   │   │   │   ├── page.tsx                    # Vue admin
│   │   │   │   ├── enterprises/
│   │   │   │   │   ├── page.tsx                # Liste entreprises
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx            # Détail entreprise
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx                # Gestion utilisateurs
│   │   │   │   └── analytics/
│   │   │   │       └── page.tsx                # Analytics globales
│   │   │   └── layout.tsx       # Layout dashboard commun
│   │   ├── api/                 # Routes API (proxy si nécessaire)
│   │   ├── globals.css
│   │   ├── layout.tsx           # Layout racine
│   │   └── page.tsx            # Page d'accueil
│   ├── components/              # Composants réutilisables
│   │   ├── ui/                 # Composants UI de base (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── chart.tsx
│   │   │   └── ...
│   │   ├── auth/               # Composants d'authentification
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthLayout.tsx
│   │   ├── dashboard/          # Composants dashboard
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ConversationDetail.tsx
│   │   │   ├── KnowledgeTable.tsx
│   │   │   ├── KnowledgeForm.tsx
│   │   │   ├── AppearanceCustomizer.tsx
│   │   │   └── IntegrationCode.tsx
│   │   ├── admin/              # Composants admin
│   │   │   ├── EnterpriseTable.tsx
│   │   │   ├── EnterpriseDetail.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   └── GlobalAnalytics.tsx
│   │   ├── charts/             # Composants graphiques
│   │   │   ├── ConversationChart.tsx
│   │   │   ├── SatisfactionChart.tsx
│   │   │   └── AnalyticsChart.tsx
│   │   └── common/             # Composants communs
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── SearchBar.tsx
│   │       ├── Pagination.tsx
│   │       └── ConfirmDialog.tsx
│   ├── hooks/                  # Hooks personnalisés
│   │   ├── useAuth.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   ├── useConversations.ts
│   │   ├── useKnowledge.ts
│   │   └── useWebSocket.ts
│   ├── lib/                    # Utilitaires et configuration
│   │   ├── api.ts             # Configuration API
│   │   ├── auth.ts            # Gestion authentification
│   │   ├── utils.ts           # Utilitaires généraux
│   │   ├── validations.ts     # Schémas de validation
│   │   ├── constants.ts       # Constantes
│   │   └── types.ts           # Types TypeScript
│   ├── store/                  # État global (Zustand)
│   │   ├── authStore.ts
│   │   ├── dashboardStore.ts
│   │   ├── knowledgeStore.ts
│   │   └── uiStore.ts
│   └── styles/                # Styles globaux
│       ├── globals.css
│       └── components.css
├── widget/                    # Widget chatbot séparé
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.ts
│   │   ├── Widget.ts
│   │   ├── ChatInterface.ts
│   │   ├── api.ts
│   │   └── styles.css
│   └── dist/                  # Build du widget
└── docs/
    └── integration-guide.md