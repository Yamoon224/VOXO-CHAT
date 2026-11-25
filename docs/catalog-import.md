# Import des catalogues produits

## Configuration

Le traitement utilise le stockage Supabase privÃ© dÃ©jÃ  configurÃ© pour les connaissances. Les modÃ¨les sont configurables :

```env
OPENAI_CATALOG_VISION_MODEL=openai/gpt-4o-mini
OPENAI_CATALOG_VISION_FALLBACK_MODEL=openai/gpt-4o
CATALOG_EXTRACTION_MIN_CONFIDENCE=0.75
PDF_MAX_PAGES=50
```

Le modÃ¨le de secours n'est appelÃ© que si des champs essentiels manquent ou si leur confiance est insuffisante.

## DÃ©ploiement

1. ExÃ©cuter `cd backend && npm run db:migrate`.
2. Initialiser et vÃ©rifier le bucket privÃ© avec `npm run storage:init`.
3. VÃ©rifier que le processus peut charger `pdfjs-dist`, `@napi-rs/canvas`, Sharp et Tesseract.
4. ExÃ©cuter `npm run test:ocr`, puis la suite Jest.
5. Importer un catalogue en brouillon et contrÃ´ler les fiches avant publication.

Les migrations `20260811000100-create-product-catalog.js` et
`20260811000200-enable-catalog-source-assets.js` ajoutent les collections, produits, demandes commerciales et sources privÃ©es. Les anciens catalogues sans source doivent Ãªtre supprimÃ©s puis importÃ©s Ã  nouveau pour devenir rÃ©analysables.

## Cycle de vie

- `draft` : import, rÃ©analyse, correction, fusion et suppression autorisÃ©s ; invisible du chatbot.
- `published` : produits visibles dans le RAG ; seule la modification du nom reste autorisÃ©e.
- `archived` : produits immÃ©diatement dÃ©sactivÃ©s ; la restauration revient en brouillon.
- La purge dÃ©finitive exige l'archivage puis la saisie exacte du nom du catalogue.

Les originaux restent dans le bucket privÃ©. L'API ne renvoie que des URL signÃ©es temporaires et n'expose jamais les clÃ©s de stockage. Une rÃ©analyse crÃ©e une nouvelle gÃ©nÃ©ration et ne remplace la prÃ©cÃ©dente qu'aprÃ¨s une analyse rÃ©ussie.

## ContrÃ´les de sÃ©curitÃ©

- signatures binaires, taille, pixels et nombre de pages validÃ©s avant analyse ;
- JavaScript PDF et Ã©valuation dynamique dÃ©sactivÃ©s ;
- OCR et texte visuel traitÃ©s comme donnÃ©es non fiables ;
- sortie IA soumise Ã  un schÃ©ma JSON strict puis normalisÃ©e ;
- requÃªtes Sequelize paramÃ©trÃ©es et filtrÃ©es par `tenantId` ;
- contenu affichÃ© par React sans HTML non fiable ;
- aucun OCR, prompt, buffer, base64, chemin temporaire ou secret dans les journaux.
