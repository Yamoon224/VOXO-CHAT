#!/usr/bin/env node

// Script pour copier le widget buildé vers le backend
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Budget bloquant : jusqu'ici la taille n'était qu'affichée, donc jamais tenue.
const MAX_MINIFIED_BYTES = 84 * 1024;
const MAX_GZIP_BYTES = 26 * 1024;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} Ko`;

// Chemins
const distSource = path.join(__dirname, 'dist');
const widgetSource = path.join(distSource, 'widget.js');
const backendPublic = path.join(__dirname, '..', 'backend', 'public');
const widgetDestination = path.join(backendPublic, 'widget.js');
const iconSource = path.join(distSource, 'widget-assets', 'chat-icon.svg');

console.log('🔄 Copie du widget vers le backend...');
console.log(`📂 Source: ${widgetSource}`);
console.log(`📁 Destination: ${widgetDestination}`);

// Créer le dossier public s'il n'existe pas
if (!fs.existsSync(backendPublic)) {
    fs.mkdirSync(backendPublic, { recursive: true });
    console.log('✅ Dossier public créé');
}

// Vérifier que le fichier source existe
if (!fs.existsSync(widgetSource)) {
    console.error('❌ Erreur: Le fichier widget.js n\'existe pas');
    console.error('   Exécutez d\'abord: npm run build');
    process.exit(1);
}

if (!fs.existsSync(iconSource)) {
    console.error('❌ Erreur: dist/widget-assets/chat-icon.svg est introuvable');
    process.exit(1);
}

// Contrôle du budget AVANT la copie : un bundle hors budget ne doit pas
// atteindre le backend.
const bundle = fs.readFileSync(widgetSource);
const gzipSize = zlib.gzipSync(bundle).length;

console.log(`📊 Minifié: ${kb(bundle.length)} / ${kb(MAX_MINIFIED_BYTES)}`);
console.log(`📊 Gzip:    ${kb(gzipSize)} / ${kb(MAX_GZIP_BYTES)}`);

const overruns = [];
if (bundle.length > MAX_MINIFIED_BYTES) {
    overruns.push(`minifié ${kb(bundle.length)} > ${kb(MAX_MINIFIED_BYTES)}`);
}
if (gzipSize > MAX_GZIP_BYTES) {
    overruns.push(`gzip ${kb(gzipSize)} > ${kb(MAX_GZIP_BYTES)}`);
}

if (overruns.length > 0) {
    console.error(`\n❌ Budget du bundle dépassé : ${overruns.join(', ')}`);
    console.error('   Allégez le widget ou révisez le budget dans copy-to-backend.js,');
    console.error('   widget/README.md et WIDGET.md — les trois doivent rester alignés.');
    process.exit(1);
}

try {
    // Copier tout le résultat Vite, y compris les assets externes du widget.
    fs.cpSync(distSource, backendPublic, { recursive: true });

    console.log('✅ Widget copié avec succès !');
    console.log('✅ Icône SVG copiée vers public/widget-assets/chat-icon.svg');
    console.log(`🌐 Le widget est maintenant disponible à: http://localhost:3000/widget.js`);
    console.log('');
    console.log('🚀 Étapes suivantes:');
    console.log('   1. Démarrez le backend: cd ../backend && npm run dev');
    console.log('   2. Testez l\'intégration sur: http://localhost:3000/widget.js');
    console.log('   3. Utilisez le widget dans vos sites web !');
    
} catch (error) {
    console.error('❌ Erreur lors de la copie:', error.message);
    process.exit(1);
}
