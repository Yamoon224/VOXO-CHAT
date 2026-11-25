
widget/package.json
widget/vite.config.js
widget/index.html (pour le développement)
widget/src/index.js - Point d'entrée principal du widget
widget/src/widget.js - Composant principal du widget
widget/src/api.js - Client API pour le widget
widget/src/utils.js - Fonctions utilitaires pour le widget
widget/.gitignore

backend/src/routes/widgetRoutes.js - Routes publiques pour le widget
backend/src/app.js - Version mise à jour avec support widget
backend/src/middleware/corsMiddleware.js - Middleware CORS spécialisé

frontend/src/app/dashboard/settings/page.js - Version mise à jour avec meilleure intégration
frontend/src/app/widget-test/page.js - Page de test du widget

-----------------------------------------------------

Notre travail consiste à faire en sorte que notre chatbot répond correctement à travers notre API Claude et en rapport avec la base de connaissance de l'entreprise sans oublier le systeme d'integration du widget sur différents sites et paramétré depuis la page /dashboard/settings

ce que nous avons deja fait :

backend/src/services/claudeService.js - Version améliorée avec RAG complet
backend/src/routes/widgetRoutes.js - Routes publiques améliorées pour le widget

frontend/src/app/dashboard/settings/page.js - Version complète avec intégration widget
frontend/src/hooks/use-chatbot-settings.js - Hook complet pour les paramètres

widget/src/widget.js - Widget JavaScript production avec API Claude complète (incomplet, code non terminé)

donne moi la suite du code de widget/src/widget.js et continuons le travail