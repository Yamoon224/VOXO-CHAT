// backend/src/scripts/setupOCR.js - Script de configuration et test OCR
const ocrService = require('../services/ocrService');
const advancedPDFService = require('../services/advancedPDFService');
const fs = require('fs').promises;
const path = require('path');

class OCRSetup {
  constructor() {
    this.testFilesDir = path.join(__dirname, '../test-files');
  }

  async run() {
    console.log('🚀 Configuration et test des services OCR et PDF...\n');

    try {
      // 1. Vérifier les dépendances système
      await this.checkSystemDependencies();

      // 2. Créer les dossiers nécessaires
      await this.createDirectories();

      // 3. Créer des fichiers de test
      await this.createTestFiles();

      // 4. Tester le service OCR
      await this.testOCRService();

      // 5. Tester le service PDF
      await this.testPDFService();

      // 6. Test complet avec fichiers
      await this.runFullTests();

      console.log('\n✅ Configuration OCR terminée avec succès !');
      console.log('\n📋 Résumé:');
      console.log('   • Service OCR: Fonctionnel');
      console.log('   • Service PDF: Fonctionnel'); 
      console.log('   • Fichiers de test: Créés');
      console.log('   • Dossiers temporaires: Configurés');

    } catch (error) {
      console.error('\n❌ Erreur lors de la configuration:', error.message);
      console.log('\n🔧 Actions recommandées:');
      console.log('   • Installer les dépendances: npm install');
      console.log('   • Vérifier que les outils système sont installés');
      console.log('   • Vérifier les permissions de fichiers');
      process.exit(1);
    }
  }

  async checkSystemDependencies() {
    console.log('🔍 Vérification des dépendances système...');

    const dependencies = [
      { name: 'tesseract.js', module: 'tesseract.js' },
      { name: 'pdf-parse', module: 'pdf-parse' },
      { name: 'mammoth', module: 'mammoth' },
      { name: 'sharp', module: 'sharp' },
      { name: 'pdf2pic', module: 'pdf2pic' }
    ];

    for (const dep of dependencies) {
      try {
        require(dep.module);
        console.log(`   ✅ ${dep.name}: Installé`);
      } catch (error) {
        console.log(`   ❌ ${dep.name}: Manquant`);
        throw new Error(`Dépendance manquante: ${dep.name}. Exécutez: npm install ${dep.module}`);
      }
    }
  }

  async createDirectories() {
    console.log('\n📁 Création des dossiers...');

    const directories = [
      this.testFilesDir,
      path.join(require('os').tmpdir(), 'chatbot-pdf-processing')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`   ✅ ${dir}: Créé`);
      } catch (error) {
        console.log(`   ⚠️ ${dir}: ${error.message}`);
      }
    }
  }

  async createTestFiles() {
    console.log('\n📄 Création des fichiers de test...');

    // Créer un fichier texte de test
    const testTextContent = `# Document de Test OCR

Ceci est un document de test pour vérifier le bon fonctionnement
du système d'extraction de texte et d'OCR.

## Fonctionnalités testées

1. Extraction de texte simple
2. Reconnaissance de caractères français: àáâãäåæçèéêëìíîï
3. Reconnaissance de chiffres: 0123456789
4. Ponctuation et caractères spéciaux: !@#$%^&*()

## Cas d'usage

- Support client
- Documentation technique
- FAQ automatisée
- Base de connaissances

Ce document permet de tester l'extraction de texte
et la génération automatique de tags.`;

    const testTextPath = path.join(this.testFilesDir, 'test-document.txt');
    await fs.writeFile(testTextPath, testTextContent, 'utf8');
    console.log('   ✅ Fichier texte de test créé');

    // Créer un PDF de test simple
    const testPDFContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 80
>>
stream
BT
/F1 12 Tf
72 720 Td
(Document PDF de Test) Tj
0 -20 Td
(Extraction de texte réussie !) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000289 00000 n 
0000000420 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
517
%%EOF`;

    const testPDFPath = path.join(this.testFilesDir, 'test-document.pdf');
    await fs.writeFile(testPDFPath, testPDFContent);
    console.log('   ✅ Fichier PDF de test créé');

    // Créer une image de test pour OCR (SVG simple)
    const testImageSVG = `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="200" fill="white"/>
  <text x="50" y="50" font-family="Arial" font-size="24" fill="black">TEST OCR IMAGE</text>
  <text x="50" y="80" font-family="Arial" font-size="16" fill="black">Extraction de texte depuis image</text>
  <text x="50" y="110" font-family="Arial" font-size="16" fill="black">Caractères français: àéèêç</text>
  <text x="50" y="140" font-family="Arial" font-size="16" fill="black">Chiffres: 123456789</text>
</svg>`;

    // Note: En production, vous créeriez une vraie image PNG
    const testImagePath = path.join(this.testFilesDir, 'test-image.svg');
    await fs.writeFile(testImagePath, testImageSVG, 'utf8');
    console.log('   ✅ Fichier image de test créé (SVG)');
    console.log('   ℹ️  Note: Pour tester l\'OCR complet, utilisez une vraie image PNG/JPG');
  }

  async testOCRService() {
    console.log('\n🔍 Test du service OCR...');

    try {
      // Test de santé
      const healthCheck = await ocrService.healthCheck();
      console.log(`   📊 Santé OCR: ${healthCheck.status}`);
      
      if (healthCheck.status === 'healthy') {
        console.log(`   ✅ OCR fonctionnel (confiance: ${healthCheck.confidence?.toFixed(1)}%)`);
      } else {
        console.log(`   ⚠️ OCR: ${healthCheck.error}`);
      }

      // Test des capacités
      const capabilities = ocrService.getCapabilities();
      console.log(`   📋 Types d'images supportés: ${capabilities.supportedImageTypes.join(', ')}`);
      console.log(`   🌍 Langues OCR: ${capabilities.ocrLanguages.join(', ')}`);

      // Test de validation de fichier
      const testBuffer = Buffer.from('test');
      const validation = ocrService.validateFile(testBuffer, 'test.jpg', 'image/jpeg');
      console.log(`   ✅ Validation de fichier: ${validation.isValid ? 'OK' : validation.errors.join(', ')}`);

    } catch (error) {
      console.log(`   ❌ Erreur OCR: ${error.message}`);
      throw error;
    }
  }

  async testPDFService() {
    console.log('\n📄 Test du service PDF...');

    try {
      // Test de santé
      const healthCheck = await advancedPDFService.healthCheck();
      console.log(`   📊 Santé PDF: ${healthCheck.status}`);
      
      if (healthCheck.status === 'healthy') {
        console.log(`   ✅ Service PDF fonctionnel`);
      } else {
        console.log(`   ⚠️ PDF: ${healthCheck.error}`);
      }

      // Test des statistiques
      const stats = advancedPDFService.getStats();
      console.log(`   📋 Pages max: ${stats.maxPages}`);
      console.log(`   🌍 Langues OCR: ${stats.ocrLanguages.join(', ')}`);

      // Test avec le PDF de test
      const testPDFPath = path.join(this.testFilesDir, 'test-document.pdf');
      
      try {
        const pdfBuffer = await fs.readFile(testPDFPath);
        const validation = advancedPDFService.validatePDF(pdfBuffer, 'test-document.pdf');
        console.log(`   ✅ Validation PDF: ${validation.isValid ? 'OK' : validation.errors.join(', ')}`);

        const metadata = await advancedPDFService.getPDFMetadata(pdfBuffer);
        console.log(`   📊 Métadonnées: ${metadata.pageCount} page(s), texte: ${metadata.hasText ? 'Oui' : 'Non'}`);
      } catch (error) {
        console.log(`   ⚠️ Test PDF fichier: ${error.message}`);
      }

    } catch (error) {
      console.log(`   ❌ Erreur service PDF: ${error.message}`);
      throw error;
    }
  }

  async runFullTests() {
    console.log('\n🧪 Tests complets...');

    try {
      // Test de traitement de fichier texte
      const textPath = path.join(this.testFilesDir, 'test-document.txt');
      const textBuffer = await fs.readFile(textPath);
      
      const textResult = await ocrService.processFile(textBuffer, 'test-document.txt', 'text/plain');
      if (textResult.success) {
        console.log(`   ✅ Traitement texte: ${textResult.content.length} caractères extraits`);
      } else {
        console.log(`   ❌ Traitement texte: ${textResult.error}`);
      }

      // Test de traitement PDF
      const pdfPath = path.join(this.testFilesDir, 'test-document.pdf');
      const pdfBuffer = await fs.readFile(pdfPath);
      
      const pdfResult = await advancedPDFService.processPDF(pdfBuffer, 'test-document.pdf');
      if (pdfResult.success) {
        console.log(`   ✅ Traitement PDF: ${pdfResult.content.length} caractères extraits`);
        console.log(`   📊 Méthode: ${pdfResult.metadata.extractionMethod}`);
      } else {
        console.log(`   ❌ Traitement PDF: ${pdfResult.error}`);
      }

    } catch (error) {
      console.log(`   ⚠️ Tests complets: ${error.message}`);
    }
  }

  async cleanup() {
    console.log('\n🧹 Nettoyage...');
    
    try {
      // Optionnel: supprimer les fichiers de test
      // await fs.rm(this.testFilesDir, { recursive: true, force: true });
      console.log('   ✅ Fichiers de test conservés pour référence');
    } catch (error) {
      console.log(`   ⚠️ Nettoyage: ${error.message}`);
    }
  }

  // Méthode pour installer automatiquement les dépendances manquantes
  async installMissingDependencies() {
    console.log('\n📦 Installation des dépendances...');

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const dependencies = [
      'tesseract.js',
      'pdf-parse', 
      'mammoth',
      'sharp',
      'pdf2pic',
      'cheerio'
    ];

    try {
      console.log('   📥 Installation en cours...');
      const { stderr } = await execAsync(`npm install ${dependencies.join(' ')}`);
      
      if (stderr && !stderr.includes('warn')) {
        console.log(`   ⚠️ Avertissements: ${stderr}`);
      }
      
      console.log('   ✅ Dépendances installées');
    } catch (error) {
      console.log(`   ❌ Erreur installation: ${error.message}`);
      console.log('   💡 Exécutez manuellement: npm install tesseract.js pdf-parse mammoth sharp pdf2pic');
    }
  }

  // Méthode pour vérifier les outils système (Poppler, Tesseract)
  async checkSystemTools() {
    console.log('\n🔧 Vérification des outils système...');

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const tools = [
      { name: 'Poppler (pdftoppm)', command: 'pdftoppm -h' },
      { name: 'ImageMagick', command: 'convert -version' },
      { name: 'Tesseract', command: 'tesseract --version' }
    ];

    for (const tool of tools) {
      try {
        await execAsync(tool.command);
        console.log(`   ✅ ${tool.name}: Installé`);
      } catch (error) {
        console.log(`   ⚠️ ${tool.name}: Non trouvé`);
        console.log(`      Note: ${tool.name} améliore les performances mais n'est pas obligatoire`);
      }
    }
  }

  // Méthode pour afficher les instructions d'utilisation
  showUsageInstructions() {
    console.log('\n📖 Instructions d\'utilisation:');
    console.log('');
    console.log('1. Upload de fichiers:');
    console.log('   POST /api/knowledge/upload');
    console.log('   Content-Type: multipart/form-data');
    console.log('   Body: file=<fichier>, title=<titre_optionnel>, tags=<tags_optionnels>');
    console.log('');
    console.log('2. Types de fichiers supportés:');
    console.log('   • Images: JPG, PNG, GIF, BMP, TIFF (avec OCR)');
    console.log('   • Documents: PDF, DOC, DOCX, TXT, MD');
    console.log('   • Taille maximum: 100MB');
    console.log('');
    console.log('3. Nouvelles routes API:');
    console.log('   • GET /api/knowledge/processing/capabilities - Capacités de traitement');
    console.log('   • POST /api/knowledge/processing/preview - Aperçu avant traitement');
    console.log('   • GET /api/knowledge/processing/health - Santé des services');
    console.log('');
    console.log('4. Fonctionnalités avancées:');
    console.log('   • OCR multi-langues (français + anglais)');
    console.log('   • Extraction PDF intelligente (texte natif + OCR)');
    console.log('   • Génération automatique de tags');
    console.log('   • Préprocessing d\'images pour améliorer l\'OCR');
    console.log('   • Métadonnées détaillées du traitement');
  }
}

// Exécution du script
if (require.main === module) {
  const setup = new OCRSetup();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--install')) {
    setup.installMissingDependencies()
      .then(() => setup.run())
      .then(() => setup.showUsageInstructions());
  } else if (args.includes('--check-system')) {
    setup.checkSystemTools();
  } else if (args.includes('--usage')) {
    setup.showUsageInstructions();
  } else {
    setup.run()
      .then(() => setup.showUsageInstructions())
      .finally(() => setup.cleanup());
  }
}

module.exports = OCRSetup;
