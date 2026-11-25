// backend/src/services/ocrService.js - OCR d'images (Tesseract + prétraitement sharp).
// Le routage par format vit désormais dans services/extraction/ : ce service
// ne fait plus que de l'OCR d'image.
const path = require('path');
const sharp = require('sharp');
const {
  MAX_FILE_BYTES,
  IMAGE_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  isAllowedExtension
} = require('../config/fileUploads');
const extractedTextService = require('./extractedTextService');
const tesseractWorkerService = require('./tesseractWorkerService');

class OCRService {
  constructor() {
    // Configuration Tesseract avec optimisations pour le français
    this.tesseractConfig = {
      lang: 'fra+eng', // Français + Anglais
      oem: 1, // LSTM OCR Engine Mode
      psm: 3, // Page Segmentation Mode: Automatic page segmentation
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ0123456789.,!?@#$%^&*()[]{}";|-_+=<>:;\'"/\\ \t\n\r'
    };
  }


  /**
   * Traitement des images avec OCR Tesseract
   */
  async processImage(buffer, filename, mimeType) {
    try {
      console.log(`📸 OCR: Traitement de l'image ${filename}`);
      
      // Préprocessing de l'image pour améliorer la qualité OCR
      const processedBuffer = await this.preprocessImage(buffer);
      
      // Configuration du worker Tesseract
      const worker = await tesseractWorkerService.createWorker('fra+eng');

      try {
  // plus besoin d'initialisation avec tesseract.js v6.x
        await worker.setParameters(this.tesseractConfig);

        // Reconnaissance OCR
        const { data } = await worker.recognize(processedBuffer);

        const extractedText = data.text.trim();
        const confidence = data.confidence;

        console.log(`✅ OCR: Texte extrait avec confiance ${confidence.toFixed(2)}%`);

        return {
          success: true,
          title: this.generateTitleFromFilename(filename),
          content: this.cleanOCRText(extractedText),
          sourceType: 'upload',
          metadata: {
            originalFileName: filename,
            fileSize: buffer.length,
            mimeType,
            ocrConfidence: confidence,
            ocrEngine: 'tesseract',
            textLength: extractedText.length,
            processingTime: Date.now(),
            imageProcessed: true
          }
        };
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      console.error('❌ OCR Image: Erreur:', error);
      // Erreur interne : imageExtractor la rattrape et se contente de la
      // journaliser (une image sans texte reste exploitable par la vision).
      // Elle n'atteint jamais le client, donc pas de code i18n à lui donner.
      throw new Error(`Image OCR failed: ${error.message}`);
    }
  }

  /**
   * Préprocessing des images pour améliorer la qualité OCR
   */
  async preprocessImage(buffer) {
    try {
      // Utiliser Sharp pour optimiser l'image pour l'OCR
      const processedBuffer = await sharp(buffer)
        .greyscale() // Convertir en niveaux de gris
        .normalize() // Normaliser le contraste
        .sharpen() // Augmenter la netteté
        .resize({ 
          width: 2000, 
          height: 2000, 
          fit: 'inside', 
          withoutEnlargement: false 
        }) // Redimensionner pour de meilleures performances
        .png({ quality: 90 }) // Convertir en PNG de haute qualité
        .toBuffer();
      
      return processedBuffer;
    } catch {
      console.warn('⚠️ OCR: Erreur lors du préprocessing, utilisation de l\'image originale');
      return buffer;
    }
  }



  /**
   * Nettoyage du texte extrait par OCR
   */
  cleanOCRText(text) {
    return extractedTextService.clean(text);
  }

  /**
   * Génération d'un titre à partir du nom de fichier
   */
  generateTitleFromFilename(filename) {
    const nameWithoutExt = path.basename(filename, path.extname(filename));
    return nameWithoutExt
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .slice(0, 100) || 'Document';
  }

  /**
   * Validation des fichiers avant traitement
   */
  validateFile(buffer, filename) {
    const errors = [];

    if (!buffer || buffer.length === 0) {
      errors.push('Fichier vide');
    }

    if (buffer && buffer.length > MAX_FILE_BYTES) {
      errors.push(`Fichier trop volumineux (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} Mo)`);
    }

    if (!isAllowedExtension(filename, 'conversation')) {
      errors.push(`Extension non supportée: ${path.extname(filename).toLowerCase()}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtenir des informations sur les capacités du service
   */
  getCapabilities() {
    return {
      supportedImageTypes: Object.keys(IMAGE_EXTENSIONS),
      supportedDocTypes: Object.keys(DOCUMENT_EXTENSIONS),
      ocrLanguages: ['fra', 'eng'],
      maxFileSize: `${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB`,
      features: {
        imageOCR: true,
        pdfExtraction: true,
        wordExtraction: true,
        spreadsheetExtraction: true,
        textExtraction: true,
        imagePreprocessing: true,
        multilanguageOCR: true
      }
    };
  }

  /**
   * Test de santé du service OCR
   */
  async healthCheck() {
    try {
      // Créer une image de test simple
      const testImage = await sharp({
        create: {
          width: 800,
          height: 240,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .png()
      .composite([{
        input: Buffer.from(
          '<svg width="800" height="240"><rect width="100%" height="100%" fill="white"/>'
          + '<text x="45" y="160" font-family="sans-serif" font-size="110" '
          + 'font-weight="bold" fill="black">TEST OCR</text></svg>'
        ),
        top: 0,
        left: 0
      }])
      .toBuffer();

      // Tester l'OCR
      const worker = await tesseractWorkerService.createWorker('eng');
      try {
  // plus besoin d'initialisation avec tesseract.js v6.x
        const { data } = await worker.recognize(testImage);
        
        const ocrWorking = data.text.toUpperCase().includes('TEST');
        return {
          status: ocrWorking ? 'healthy' : 'unhealthy',
          ocrWorking,
          confidence: data.confidence,
          timestamp: new Date().toISOString()
        };
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new OCRService();
