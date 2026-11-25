# Installation WooCommerce

Utilisez le même snippet que WordPress, disponible dans l'onglet **Intégration**. Vérifiez spécifiquement les pages catalogue, panier et paiement après avoir purgé les caches.

Les CSP des passerelles de paiement ou les optimiseurs JavaScript peuvent empêcher le chargement du widget. Dans ce cas, autorisez le domaine du backend dans `script-src` et `connect-src`, puis retestez sans concaténation de scripts.
