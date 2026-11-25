# Installation WordPress

Dans **Apparence > Éditeur de fichiers du thème** (ou un plugin d'insertion de code fiable), collez le snippet fourni par VOXO juste avant `</body>`. Publiez, videz le cache WordPress et vérifiez que la requête charge `widget.js` depuis votre backend.

N'utilisez pas un optimiseur qui concatène ou réécrit le snippet. Si un différé JavaScript est imposé, vérifiez le widget et les appels réseau après publication.
