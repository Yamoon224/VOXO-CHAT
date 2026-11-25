// backend/src/controllers/knowledgeController.js - Version améliorée avec gestion de fichiers
const { sequelize, KnowledgeBase, KnowledgeChunk, CrawlJob, User } = require('../models');
const { CRAWL_STATUS } = require('../models/CrawlJob');
const ragService = require('../services/ragService');
const quotaService = require('../services/quotaService');
const ocrService = require('../services/ocrService');
const advancedPDFService = require('../services/advancedPDFService');
const fileProcessingService = require('../services/fileProcessingService');
const siteCrawlerService = require('../services/siteCrawlerService');
const { successResponse, paginatedResponse } = require('../utils/responseUtils');
const { AppError } = require('../middleware/errorMiddleware');
const { Op } = require('sequelize');
const knowledgeIngestionService = require('../services/knowledgeIngestionService');
const fileValidationService = require('../services/fileValidationService');
const storageService = require('../services/storageService');
const { MAX_FILE_BYTES, allowedExtensions, extensionOf } = require('../config/fileUploads');
const { safeMetadata } = require('../utils/knowledgeSerializer');

class KnowledgeController {
  // Lister les connaissances avec recherche et filtres
  async getKnowledgeBase(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        sourceType,
        tags,
        isActive = true,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const tenant = req.tenant;
      const offset = (Number(page) - 1) * Number(limit);

      // Construire les conditions de recherche
      const whereClause = {
        tenantId: tenant.id,
      };

      if (isActive !== 'all') {
        whereClause.isActive = isActive === 'true';
      }

      if (sourceType) {
        whereClause.sourceType = sourceType;
      }

      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { content: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : tags.split(',');
        whereClause.tags = {
          [Op.overlap]: tagArray
        };
      }

      // Récupérer les données avec pagination
      const { count, rows: knowledgeItems } = await KnowledgeBase.findAndCountAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        }],
        limit: Number(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
      });

      // Préparer les données de réponse
      const formattedItems = knowledgeItems.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content.substring(0, 200) + (item.content.length > 200 ? '...' : ''),
        fullContent: item.content,
        sourceType: item.sourceType,
        sourceUrl: item.sourceUrl,
        tags: item.tags,
        isActive: item.isActive,
        hasEmbedding: !!item.embedding,
        metadata: safeMetadata(item.metadata),
        creator: item.creator ? {
          name: `${item.creator.firstName} ${item.creator.lastName}`,
          email: item.creator.email,
        } : null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      const pagination = {
        page: Number(page),
        limit: Number(limit),
        total: count,
      };

      paginatedResponse(res, formattedItems, pagination, 'Base de connaissances récupérée');

    } catch (error) {
      next(error);
    }
  }

  // Récupérer une connaissance spécifique
  async getKnowledgeItem(req, res, next) {
    try {
      const { id } = req.params;
      const tenant = req.tenant;

      const knowledgeItem = await KnowledgeBase.findOne({
        where: {
          id,
          tenantId: tenant.id,
        },
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        }],
      });

      if (!knowledgeItem) {
        return next(new AppError('Élément de base de connaissances non trouvé', 404, { code: 'KNOWLEDGE_NOT_FOUND' }));
      }

      const formattedItem = {
        id: knowledgeItem.id,
        title: knowledgeItem.title,
        content: knowledgeItem.content,
        sourceType: knowledgeItem.sourceType,
        sourceUrl: knowledgeItem.sourceUrl,
        tags: knowledgeItem.tags,
        isActive: knowledgeItem.isActive,
        hasEmbedding: !!knowledgeItem.embedding,
        metadata: safeMetadata(knowledgeItem.metadata),
        creator: knowledgeItem.creator ? {
          id: knowledgeItem.creator.id,
          name: `${knowledgeItem.creator.firstName} ${knowledgeItem.creator.lastName}`,
          email: knowledgeItem.creator.email,
        } : null,
        createdAt: knowledgeItem.createdAt,
        updatedAt: knowledgeItem.updatedAt,
      };

      successResponse(res, formattedItem, 'Élément récupéré avec succès');

    } catch (error) {
      next(error);
    }
  }

  // Créer une nouvelle connaissance (manuel)
  async createKnowledge(req, res, next) {
    try {
      const {
        title,
        content,
        sourceType = 'manual',
        sourceUrl,
        tags = [],
        isActive = true,
        metadata = {}
      } = req.body;

      const tenant = req.tenant;
      const user = req.user;

      // Validation de base
      if (!title || !content) {
        return next(new AppError('Le titre et le contenu sont requis', 400, { code: 'KNOWLEDGE_TITLE_CONTENT_REQUIRED' }));
      }

      if (content.length > 10000) {
        return next(new AppError('Le contenu ne peut pas dépasser 10000 caractères', 400, { code: 'KNOWLEDGE_CONTENT_TOO_LONG' }));
      }

      // Valider les données
      const validation = fileProcessingService.validateKnowledgeData({
        title,
        content,
        sourceUrl
      });

      if (!validation.isValid) {
        return next(new AppError(validation.errors.join(', '), 400, { code: 'KNOWLEDGE_VALIDATION_ERROR', preTranslated: true }));
      }

      await quotaService.assertCanCreateDocuments(tenant, isActive === false ? 0 : 1);

      // Créer l'élément de connaissance
      const knowledgeItem = await KnowledgeBase.create({
        tenantId: tenant.id,
        title: title.trim(),
        content: content.trim(),
        sourceType,
        sourceUrl,
        tags: Array.isArray(tags) ? tags : [],
        isActive,
        metadata,
        createdBy: user.id,
      });

      // Indexer les chunks RAG en arriere-plan
      this.generateEmbeddingAsync(knowledgeItem);

      const responseData = {
        id: knowledgeItem.id,
        title: knowledgeItem.title,
        content: knowledgeItem.content,
        sourceType: knowledgeItem.sourceType,
        sourceUrl: knowledgeItem.sourceUrl,
        tags: knowledgeItem.tags,
        isActive: knowledgeItem.isActive,
        metadata: safeMetadata(knowledgeItem.metadata),
        createdAt: knowledgeItem.createdAt,
      };

      successResponse(res, responseData, 'Connaissance créée avec succès', 201);

    } catch (error) {
      next(error);
    }
  }

  // Créer une connaissance à partir d'un fichier (multer en amont via uploadKnowledgeFile)
  async createKnowledgeFromFile(req, res, next) {
    try {
      const knowledgeItem = await knowledgeIngestionService.ingestFile(
        req.tenant,
        req.user,
        req.file,
        { title: req.body.title, tags: req.body.tags }
      );

      successResponse(res, {
        id: knowledgeItem.id,
        title: knowledgeItem.title,
        content: knowledgeItem.content.slice(0, 500),
        sourceType: knowledgeItem.sourceType,
        tags: knowledgeItem.tags,
        metadata: safeMetadata(knowledgeItem.metadata),
        createdAt: knowledgeItem.createdAt,
      }, 'Fichier traité et connaissance créée avec succès', 201);
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les capacités de traitement de fichiers
  async getProcessingCapabilities(req, res, next) {
    try {
      successResponse(res, {
        ocr: ocrService.getCapabilities(),
        pdf: advancedPDFService.getStats(),
        supportedExtensions: allowedExtensions('knowledge'),
        maxFileBytes: MAX_FILE_BYTES,
        features: {
          advancedPDFProcessing: true,
          imageOCR: true,
          spreadsheetExtraction: true,
          multiLanguageOCR: true,
          automaticTagGeneration: true,
          metadataExtraction: true,
          originalFileRetention: storageService.isConfigured(),
        },
      }, 'Capacités de traitement récupérées');
    } catch (error) {
      next(error);
    }
  }

  // Prévisualiser un fichier avant traitement complet (multer en amont)
  async previewFileProcessing(req, res, next) {
    try {
      const { originalname, mimetype, size, buffer } = req.file;
      const extension = extensionOf(originalname);
      const preview = { filename: originalname, size, mimeType: mimetype, extension };

      if (extension === '.pdf') {
        const metadata = await advancedPDFService.getPDFMetadata(buffer);
        preview.pdf = {
          pageCount: metadata.pageCount,
          hasText: metadata.hasText,
          estimatedProcessingTime: metadata.estimatedProcessingTime,
          recommendedMethod: metadata.hasText ? 'direct' : 'ocr',
        };
      }

      // Validation réelle, signature binaire comprise
      try {
        fileValidationService.validateUpload(buffer, originalname, mimetype, 'knowledge');
        preview.validation = { isValid: true, errors: [] };
      } catch (error) {
        preview.validation = { isValid: false, errors: [error.message] };
      }

      successResponse(res, preview, 'Aperçu du fichier généré');
    } catch (error) {
      next(error);
    }
  }
      
        // Test de santé des services de traitement
        async getProcessingHealth(req, res, next) {
          try {
            const [ocrHealth, pdfHealth] = await Promise.all([
              ocrService.healthCheck(),
              advancedPDFService.healthCheck()
            ]);
      
            const overall = ocrHealth.status === 'healthy' && pdfHealth.status === 'healthy' 
              ? 'healthy' : 'degraded';
      
            successResponse(res, {
              overall,
              services: {
                ocr: ocrHealth,
                pdf: pdfHealth
              },
              timestamp: new Date().toISOString()
            }, 'État de santé des services de traitement');
      
          } catch (error) {
            next(error);
          }
        }
      
  // Méthodes utilitaires : la génération de tags vit dans knowledgeIngestionService
  generateAutoTags(title, content, filename, metadata = {}) {
    return knowledgeIngestionService.generateAutoTags(title, content, filename, metadata);
  }

  combineTags(autoTags = [], userTags = []) {
    return knowledgeIngestionService.combineTags(autoTags, userTags);
  }

  // Créer une connaissance à partir d'une URL
  async createKnowledgeFromUrl(req, res, next) {
    try {
      const { url, title: customTitle, tags } = req.body;
      const tenant = req.tenant;
      const user = req.user;

      if (!url) {
        return next(new AppError('URL requise', 400, { code: 'KNOWLEDGE_URL_REQUIRED' }));
      }

      await quotaService.assertCanCreateDocuments(tenant);

      // Traitement de l'URL
      const result = await fileProcessingService.processUrl(url);

      if (!result.success) {
        // Message explicite plutôt que l'erreur axios brute (anti-bot, JS-only, 404...)
        const message = fileProcessingService.describeFailure(result.reason, url, result.error);
        // Message de diagnostic construit à la volée (il nomme le domaine) :
        // renvoyé tel quel, MESSAGES[code] ne servant que de libellé de repli.
        const appError = new AppError(message, 400, {
          code: 'URL_PROCESSING_FAILED',
          preTranslated: true,
        });
        appError.reason = result.reason;
        return next(appError);
      }

      // Générer des tags automatiquement
      const autoTags = fileProcessingService.generateTags(
        result.title,
        result.content,
        result.sourceType
      );

      // Combiner avec les tags fournis par l'utilisateur
      const allTags = this.combineTags(autoTags, tags);

      // Créer l'élément de connaissance
      const knowledgeItem = await KnowledgeBase.create({
        tenantId: tenant.id,
        title: customTitle || result.title,
        content: result.content,
        sourceType: result.sourceType,
        sourceUrl: result.sourceUrl,
        tags: allTags,
        isActive: true,
        metadata: {
          ...result.metadata,
          userProvided: {
            customTitle: !!customTitle,
            customTags: Array.isArray(tags) ? tags.length > 0 : !!tags,
          },
        },
        createdBy: user.id,
      });

      // Indexer les chunks RAG en arriere-plan
      this.generateEmbeddingAsync(knowledgeItem);

      successResponse(res, {
        id: knowledgeItem.id,
        title: knowledgeItem.title,
        content: knowledgeItem.content,
        sourceType: knowledgeItem.sourceType,
        sourceUrl: knowledgeItem.sourceUrl,
        tags: knowledgeItem.tags,
        metadata: safeMetadata(knowledgeItem.metadata),
        createdAt: knowledgeItem.createdAt,
      }, 'Connaissance créée à partir de l\'URL avec succès', 201);

    } catch (error) {
      next(error);
    }
  }

  // Lancer le crawl multi-pages d'un site.
  // Réponse immédiate (202) : le parcours dépasse largement le timeout HTTP du front.
  async crawlSite(req, res, next) {
    try {
      const { url, title, tags, maxPages, maxDepth, includeSubdomains, sitemapUrl } = req.body;
      const tenant = req.tenant;
      const user = req.user;

      // Au moins une place disponible avant de démarrer
      await quotaService.assertCanCreateDocuments(tenant);

      const options = {
        maxPages: maxPages || siteCrawlerService.DEFAULTS.maxPages,
        maxDepth: maxDepth || siteCrawlerService.DEFAULTS.maxDepth,
        includeSubdomains: !!includeSubdomains,
        sitemapUrl: sitemapUrl || null,
        titlePrefix: title || null,
        tags: Array.isArray(tags) ? tags : [],
      };

      const job = await CrawlJob.create({
        tenantId: tenant.id,
        rootUrl: url,
        status: CRAWL_STATUS.PENDING,
        options,
        createdBy: user.id,
      });

      // Exécution en arrière-plan : le client suit l'avancement par polling
      this.runCrawlAsync(job, tenant, user, options);

      successResponse(res, {
        id: job.id,
        rootUrl: job.rootUrl,
        status: job.status,
        options,
        createdAt: job.createdAt,
      }, 'Crawl du site démarré', 202);

    } catch (error) {
      next(error);
    }
  }

  // Parcours effectif du site, hors cycle de requête HTTP
  async runCrawlAsync(job, tenant, user, options) {
    try {
      await job.update({ status: CRAWL_STATUS.RUNNING, startedAt: new Date() });

      let quotaReached = false;
      // Documents réellement persistés : peut être inférieur aux pages récupérées
      // si le quota du tenant est atteint en cours de route.
      let documentsCreated = 0;

      // Chaque page indexée devient une connaissance rattachée au job
      const onPage = async (event) => {
        if (event.status !== 'indexed' || quotaReached) return;

        try {
          await quotaService.assertCanCreateDocuments(tenant);
        } catch (quotaError) {
          quotaReached = true;
          return;
        }

        const page = event.page;
        const autoTags = fileProcessingService.generateTags(
          page.title,
          page.content,
          page.sourceType
        );

        const knowledgeItem = await KnowledgeBase.create({
          tenantId: tenant.id,
          // Le titre saisi sert de préfixe : une page ne peut pas porter le titre du site entier
          title: options.titlePrefix
            ? `${options.titlePrefix} — ${page.title}`.slice(0, 500)
            : page.title,
          content: page.content,
          sourceType: 'url',
          sourceUrl: page.sourceUrl,
          tags: this.combineTags(autoTags, options.tags),
          isActive: true,
          metadata: { ...page.metadata, crawlJobId: job.id },
          crawlJobId: job.id,
          createdBy: user.id,
        });

        this.generateEmbeddingAsync(knowledgeItem);

        documentsCreated += 1;
        // Compteur incrémenté au fil de l'eau pour le suivi en direct
        await job.increment('pagesIndexed');
      };

      const result = await siteCrawlerService.crawl(job.rootUrl, options, onPage);

      // Le nombre de pages récupérées par le crawler peut dépasser le nombre de
      // documents créés : c'est ce dernier qui fait foi pour le client.
      const summary = { ...result, pagesIndexed: documentsCreated };

      await job.update({
        status: this.resolveCrawlStatus(summary, quotaReached),
        strategy: result.strategy,
        discoveredVia: result.discoveredVia,
        pagesDiscovered: result.pagesDiscovered,
        pagesIndexed: documentsCreated,
        pagesFailed: result.pagesFailed,
        failureReason: this.dominantFailureReason(result),
        failureMessage: this.buildCrawlMessage(summary, quotaReached, job.rootUrl),
        errors: result.failures.slice(0, 100),
        finishedAt: new Date(),
      });

    } catch (error) {
      console.error(`Erreur du crawl ${job.id} (${job.rootUrl}):`, error.message);
      await job.update({
        status: CRAWL_STATUS.FAILED,
        failureMessage: `Le crawl a échoué: ${error.message}`,
        finishedAt: new Date(),
      }).catch(() => {});
    }
  }

  // Déterminer le statut final d'un crawl
  resolveCrawlStatus(result, quotaReached) {
    if (result.blocked && result.pagesIndexed === 0) return CRAWL_STATUS.BLOCKED;
    if (result.pagesIndexed === 0) return CRAWL_STATUS.FAILED;
    if (result.blocked || quotaReached || result.pagesFailed > 0) return CRAWL_STATUS.PARTIAL;
    return CRAWL_STATUS.COMPLETED;
  }

  // Cause d'échec la plus fréquente, pour orienter le message affiché
  dominantFailureReason(result) {
    if (result.rootFailureReason) return result.rootFailureReason;
    if (!result.failures?.length) return null;

    const counts = result.failures.reduce((acc, failure) => {
      acc[failure.reason] = (acc[failure.reason] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  // Message destiné au client, adapté à l'issue du crawl
  buildCrawlMessage(result, quotaReached, rootUrl) {
    if (result.blocked) {
      return result.blockedMessage
        + ` ${result.pagesIndexed} page(s) sur ${result.pagesDiscovered} ont pu être récupérées.`;
    }

    if (result.pagesIndexed === 0) {
      const reason = this.dominantFailureReason(result);
      return fileProcessingService.describeFailure(
        reason,
        rootUrl || '',
        'Aucune page n\'a pu être récupérée sur ce site.'
      );
    }

    if (quotaReached) {
      return `Quota de documents atteint : ${result.pagesIndexed} page(s) indexée(s) sur `
        + `${result.pagesDiscovered} découvertes. Passez à un plan supérieur pour indexer le reste.`;
    }

    if (result.pagesFailed > 0) {
      return `${result.pagesIndexed} page(s) indexée(s), ${result.pagesFailed} en échec `
        + '(voir le détail des erreurs).';
    }

    return null;
  }

  // Consulter l'état d'un crawl (polling depuis le dashboard)
  async getCrawlJob(req, res, next) {
    try {
      const { id } = req.params;

      const job = await CrawlJob.findOne({
        where: { id, tenantId: req.tenant.id },
      });

      if (!job) {
        return next(new AppError('Crawl introuvable', 404, { code: 'CRAWL_NOT_FOUND' }));
      }

      successResponse(res, this.serializeCrawlJob(job), 'État du crawl récupéré');
    } catch (error) {
      next(error);
    }
  }

  // Lister les crawls d'un tenant
  async listCrawlJobs(req, res, next) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

      const jobs = await CrawlJob.findAll({
        where: { tenantId: req.tenant.id },
        order: [['createdAt', 'DESC']],
        limit,
      });

      successResponse(
        res,
        jobs.map((job) => this.serializeCrawlJob(job)),
        'Crawls récupérés'
      );
    } catch (error) {
      next(error);
    }
  }

  serializeCrawlJob(job) {
    const isFinished = [
      CRAWL_STATUS.COMPLETED,
      CRAWL_STATUS.PARTIAL,
      CRAWL_STATUS.BLOCKED,
      CRAWL_STATUS.FAILED,
    ].includes(job.status);

    return {
      id: job.id,
      rootUrl: job.rootUrl,
      status: job.status,
      isFinished,
      strategy: job.strategy,
      discoveredVia: job.discoveredVia,
      pagesDiscovered: job.pagesDiscovered,
      pagesIndexed: job.pagesIndexed,
      pagesFailed: job.pagesFailed,
      failureReason: job.failureReason,
      failureMessage: job.failureMessage,
      errors: job.errors || [],
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      createdAt: job.createdAt,
    };
  }

  // Retraiter une connaissance : re-scraper la source puis ré-indexer
  async reprocessKnowledge(req, res, next) {
    try {
      const { id } = req.params;
      const tenant = req.tenant;

      const knowledgeItem = await KnowledgeBase.findOne({
        where: { id, tenantId: tenant.id },
      });

      if (!knowledgeItem) {
        return next(new AppError('Élément non trouvé', 404, { code: 'KNOWLEDGE_NOT_FOUND' }));
      }

      if (knowledgeItem.sourceType === 'url' && knowledgeItem.sourceUrl) {
        const result = await fileProcessingService.processUrl(knowledgeItem.sourceUrl);

        if (!result.success) {
          const message = fileProcessingService.describeFailure(
            result.reason,
            knowledgeItem.sourceUrl,
            result.error
          );
          // Diagnostic dynamique renvoyé tel quel (cf. commentaire plus haut).
          return next(new AppError(message, 400, {
            code: 'URL_PROCESSING_FAILED',
            preTranslated: true,
          }));
        }

        await knowledgeItem.update({
          title: knowledgeItem.metadata?.userProvided?.customTitle
            ? knowledgeItem.title
            : result.title,
          content: result.content,
          metadata: {
            ...knowledgeItem.metadata,
            ...result.metadata,
            reprocessedAt: new Date().toISOString(),
          },
        });

        this.generateEmbeddingAsync(knowledgeItem);

        return successResponse(res, {
          id: knowledgeItem.id,
          title: knowledgeItem.title,
          contentLength: result.content.length,
          sourceUrl: knowledgeItem.sourceUrl,
        }, 'Contenu récupéré à nouveau et ré-indexation lancée');
      }

      // Un fichier importé est retraité depuis l'original conservé au stockage.
      if (knowledgeItem.sourceType === 'upload') {
        const result = await knowledgeIngestionService.reingestFile(tenant, knowledgeItem);

        return successResponse(res, {
          id: knowledgeItem.id,
          title: knowledgeItem.title,
          contentLength: result.knowledgeItem.content.length,
          extractionMethod: result.extractionMethod,
        }, 'Fichier retraité et ré-indexation lancée');
      }

      // Contenu manuel ou API : rien à re-récupérer, on relance l'indexation RAG
      this.generateEmbeddingAsync(knowledgeItem);

      successResponse(res, {
        id: knowledgeItem.id,
        title: knowledgeItem.title,
      }, 'Ré-indexation lancée');

    } catch (error) {
      next(error);
    }
  }

  // Mettre à jour une connaissance existante
  async updateKnowledge(req, res, next) {
    try {
      const { id } = req.params;
      const {
        title,
        content,
        sourceType,
        sourceUrl,
        tags,
        isActive,
        metadata
      } = req.body;

      const tenant = req.tenant;

      const knowledgeItem = await KnowledgeBase.findOne({
        where: {
          id,
          tenantId: tenant.id,
        },
      });

      if (!knowledgeItem) {
        return next(new AppError('Élément de base de connaissances non trouvé', 404, { code: 'KNOWLEDGE_NOT_FOUND' }));
      }

      // Préparer les données de mise à jour
      const updateData = {};
      
      if (title !== undefined) {
        updateData.title = title.trim();
      }
      
      if (content !== undefined) {
        if (content.length > 10000) {
          return next(new AppError('Le contenu ne peut pas dépasser 10000 caractères', 400, { code: 'KNOWLEDGE_CONTENT_TOO_LONG' }));
        }
        updateData.content = content.trim();
        // Si le contenu change, on devra regénérer l'embedding
        updateData.embedding = null;
      }
      
      if (sourceType !== undefined) updateData.sourceType = sourceType;
      if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
      if (isActive !== undefined) updateData.isActive = isActive;
      if (metadata !== undefined) updateData.metadata = metadata;

      // Valider les données
      if (updateData.title || updateData.content || updateData.sourceUrl) {
        const validation = fileProcessingService.validateKnowledgeData({
          title: updateData.title || knowledgeItem.title,
          content: updateData.content || knowledgeItem.content,
          sourceUrl: updateData.sourceUrl || knowledgeItem.sourceUrl
        });

        if (!validation.isValid) {
          return next(new AppError(validation.errors.join(', '), 400, { code: 'KNOWLEDGE_VALIDATION_ERROR', preTranslated: true }));
        }
      }

      // Mettre à jour
      await knowledgeItem.update(updateData);

      // Regénérer l'embedding si le contenu a changé
      if (content !== undefined) {
        this.generateEmbeddingAsync(knowledgeItem);
      }

      const responseData = {
        id: knowledgeItem.id,
        title: knowledgeItem.title,
        content: knowledgeItem.content,
        sourceType: knowledgeItem.sourceType,
        sourceUrl: knowledgeItem.sourceUrl,
        tags: knowledgeItem.tags,
        isActive: knowledgeItem.isActive,
        metadata: safeMetadata(knowledgeItem.metadata),
        hasEmbedding: !!knowledgeItem.embedding,
        updatedAt: knowledgeItem.updatedAt,
      };

      successResponse(res, responseData, 'Connaissance mise à jour avec succès');

    } catch (error) {
      next(error);
    }
  }

  // Supprimer une connaissance
  async deleteKnowledge(req, res, next) {
    try {
      const { id } = req.params;
      const tenant = req.tenant;

      const knowledgeItem = await KnowledgeBase.findOne({
        where: {
          id,
          tenantId: tenant.id,
        },
      });

      if (!knowledgeItem) {
        return next(new AppError('Élément de base de connaissances non trouvé', 404, { code: 'KNOWLEDGE_NOT_FOUND' }));
      }

      await sequelize.transaction(async (transaction) => {
        await KnowledgeChunk.destroy({
          where: { knowledgeBaseId: knowledgeItem.id, tenantId: tenant.id },
          transaction,
        });
        await knowledgeItem.destroy({ transaction });
      });

      // Hors transaction : un échec de suppression du fichier ne doit pas
      // annuler la suppression du document, il laisse au pire un orphelin.
      await knowledgeIngestionService.removeOriginal(tenant.id, knowledgeItem);

      successResponse(res, null, 'Connaissance supprimée définitivement');

    } catch (error) {
      next(error);
    }
  }

  // Rechercher dans la base de connaissances
  async searchKnowledge(req, res, next) {
    try {
      const { q: query, limit = 10 } = req.query;
      const tenant = req.tenant;

      if (!query || String(query).trim().length === 0) {
        return next(new AppError('Requete de recherche requise', 400, { code: 'SEARCH_QUERY_REQUIRED' }));
      }

      const results = await ragService.search(tenant.id, String(query).trim(), Number(limit));
      const formattedResults = results.map(result => ({
        id: result.knowledgeId,
        knowledgeId: result.knowledgeId,
        chunkId: result.chunkId,
        title: result.title,
        content: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
        similarity: result.similarity || 0.5,
        tags: result.tags || [],
        sourceType: result.sourceType,
        metadata: result.metadata || {},
      }));

      return successResponse(res, formattedResults, 'Recherche effectuee');
    } catch (error) {
      next(error);
    }
  }
  // Recherche textuelle basique
  async basicTextSearch(tenantId, query, limit) {
    const results = await KnowledgeBase.findAll({
      where: {
        tenantId,
        isActive: true,
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { content: { [Op.iLike]: `%${query}%` } },
        ],
      },
      limit: Number(limit),
      order: [['updatedAt', 'DESC']],
    });

    return results.map(item => ({
      item,
      similarity: 0.5 // Score arbitraire pour la recherche textuelle
    }));
  }

  // Obtenir les statistiques de la base de connaissances
  async getKnowledgeStats(req, res, next) {
    try {
      const tenant = req.tenant;

      // Statistiques par type de source
      const statsBySource = await KnowledgeBase.findAll({
        where: { tenantId: tenant.id },
        attributes: [
          'sourceType',
          [require('sequelize').fn('COUNT', '*'), 'count'],
          [require('sequelize').fn('COUNT', require('sequelize').col('embedding')), 'withEmbedding'],
        ],
        group: ['sourceType'],
        raw: true,
      });

      // Statistiques totales
      const totalStats = await KnowledgeBase.findOne({
        where: { tenantId: tenant.id },
        attributes: [
          [require('sequelize').fn('COUNT', '*'), 'total'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "is_active" = true THEN 1 END')), 'active'],
          [require('sequelize').fn('COUNT', require('sequelize').col('embedding')), 'withEmbedding'],
          [require('sequelize').fn('AVG', require('sequelize').fn('LENGTH', require('sequelize').col('content'))), 'avgContentLength'],
        ],
        raw: true,
      });

      const ragStatus = await ragService.getIndexStatus(tenant.id);

      // Statistiques par tags (top 10)
      const allKnowledge = await KnowledgeBase.findAll({
        where: { tenantId: tenant.id, isActive: true },
        attributes: ['tags'],
        raw: true,
      });

      // Compter les tags
      const tagCount = {};
      allKnowledge.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach(tag => {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
          });
        }
      });

      const topTags = Object.entries(tagCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      const quota = await quotaService.getQuotaStatus(tenant);

      const responseData = {
        total: parseInt(totalStats.total) || 0,
        active: parseInt(totalStats.active) || 0,
        withEmbedding: ragStatus.indexedDocuments,
        avgContentLength: Math.round(parseFloat(totalStats.avgContentLength) || 0),
        bySourceType: statsBySource.map(stat => ({
          sourceType: stat.sourceType,
          count: parseInt(stat.count),
          withEmbedding: parseInt(stat.withEmbedding),
        })),
        topTags,
        embeddingCoverage: ragStatus.embeddingCoverage,
        rag: ragStatus,
        quota,
      };

      successResponse(res, responseData, 'Statistiques récupérées');

    } catch (error) {
      next(error);
    }
  }

  // Importer des connaissances en lot
  async bulkImport(req, res, next) {
    try {
      const { knowledgeItems } = req.body;
      const tenant = req.tenant;
      const user = req.user;

      if (!Array.isArray(knowledgeItems) || knowledgeItems.length === 0) {
        return next(new AppError('La liste des connaissances est requise', 400, { code: 'KNOWLEDGE_LIST_REQUIRED' }));
      }

      if (knowledgeItems.length > 100) {
        return next(new AppError('Maximum 100 éléments par import', 400, { code: 'KNOWLEDGE_IMPORT_LIMIT' }));
      }

      const activeImportCount = knowledgeItems.filter(item => item.isActive !== false).length;
      await quotaService.assertCanCreateDocuments(tenant, activeImportCount);

      const results = {
        imported: 0,
        errors: [],
        items: []
      };

      for (let i = 0; i < knowledgeItems.length; i++) {
        const item = knowledgeItems[i];
        
        try {
          // Validation de chaque élément
          const validation = fileProcessingService.validateKnowledgeData(item);
          
          if (!validation.isValid) {
            results.errors.push({
              index: i,
              error: validation.errors.join(', '),
              item: item.title || 'Sans titre'
            });
            continue;
          }

          // Créer l'élément
          const knowledgeItem = await KnowledgeBase.create({
            tenantId: tenant.id,
            title: item.title.trim(),
            content: item.content.trim(),
            sourceType: item.sourceType || 'manual',
            sourceUrl: item.sourceUrl,
            tags: Array.isArray(item.tags) ? item.tags : [],
            isActive: item.isActive !== false,
            metadata: safeMetadata(item.metadata),
            createdBy: user.id,
          });

          // Indexer les chunks RAG en arriere-plan
          this.generateEmbeddingAsync(knowledgeItem);

          results.imported++;
          results.items.push({
            id: knowledgeItem.id,
            title: knowledgeItem.title,
            index: i
          });

        } catch (error) {
          results.errors.push({
            index: i,
            error: error.message,
            item: item.title || 'Sans titre'
          });
        }
      }

      const message = `Import terminé: ${results.imported} éléments importés, ${results.errors.length} erreurs`;
      successResponse(res, results, message);

    } catch (error) {
      next(error);
    }
  }

  // Regénérer les embeddings pour tous les éléments
  async regenerateEmbeddings(req, res, next) {
    try {
      const tenant = req.tenant;
      const { force = false } = req.query;

      const summary = await ragService.indexTenantKnowledge(tenant.id, {
        force: force === true || force === 'true',
      });
      const status = await ragService.getIndexStatus(tenant.id);

      console.log('RAG regeneration terminee:', summary);

      return successResponse(res, {
        message: 'Indexation RAG terminee',
        force: force === true || force === 'true',
        summary,
        status,
      });

    } catch (error) {
      next(error);
    }
  }

  // ===== MÉTHODES UTILITAIRES =====
  // Reconstruire les chunks RAG et indexer leurs embeddings en arriere-plan.
  async generateEmbeddingAsync(knowledgeItem) {
    try {
      console.log(`RAG: reconstruction des chunks pour ${knowledgeItem.title}`);
      const result = await ragService.rebuildKnowledgeItem(knowledgeItem, { force: true });

      await knowledgeItem.update({
        metadata: {
          ...knowledgeItem.metadata,
          ragIndexed: true,
          ragIndexedAt: new Date().toISOString(),
          ragChunksCreated: result.created,
          ragChunksEmbedded: result.embedded,
        }
      });

      console.log(`RAG: ${result.created} chunks crees, ${result.embedded} indexes pour ${knowledgeItem.title}`);
    } catch (error) {
      console.error(`Erreur RAG pour "${knowledgeItem.title}":`, error.message);
    }
  }

}

const knowledgeController = new KnowledgeController();

module.exports = {
  getKnowledgeBase: knowledgeController.getKnowledgeBase.bind(knowledgeController),
  getKnowledgeItem: knowledgeController.getKnowledgeItem.bind(knowledgeController),
  createKnowledge: knowledgeController.createKnowledge.bind(knowledgeController),
  // Nouvelles méthodes avec OCR
  getProcessingCapabilities: knowledgeController.getProcessingCapabilities.bind(knowledgeController),
  previewFileProcessing: knowledgeController.previewFileProcessing.bind(knowledgeController),
  getProcessingHealth: knowledgeController.getProcessingHealth.bind(knowledgeController),

  createKnowledgeFromFile: knowledgeController.createKnowledgeFromFile.bind(knowledgeController),

  createKnowledgeFromUrl: knowledgeController.createKnowledgeFromUrl.bind(knowledgeController),
  // Crawl multi-pages d'un domaine
  crawlSite: knowledgeController.crawlSite.bind(knowledgeController),
  getCrawlJob: knowledgeController.getCrawlJob.bind(knowledgeController),
  listCrawlJobs: knowledgeController.listCrawlJobs.bind(knowledgeController),
  reprocessKnowledge: knowledgeController.reprocessKnowledge.bind(knowledgeController),
  updateKnowledge: knowledgeController.updateKnowledge.bind(knowledgeController),
  deleteKnowledge: knowledgeController.deleteKnowledge.bind(knowledgeController),
  bulkImport: knowledgeController.bulkImport.bind(knowledgeController),
  searchKnowledge: knowledgeController.searchKnowledge.bind(knowledgeController),
  regenerateEmbeddings: knowledgeController.regenerateEmbeddings.bind(knowledgeController),
  getKnowledgeStats: knowledgeController.getKnowledgeStats.bind(knowledgeController),
};
