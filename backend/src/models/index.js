// src/models/index.js
const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');
const User = require('./User');
const KnowledgeBase = require('./KnowledgeBase');
const KnowledgeChunk = require('./KnowledgeChunk');
const Conversation = require('./Conversation');
const ChannelUser = require('./ChannelUser');
const MobilePushDevice = require('./MobilePushDevice');
const TenantUsage = require('./TenantUsage');
const Plan = require('./Plan');
const PaymentTransaction = require('./PaymentTransaction');
const {
  defineSupportAssociations, SupportTicket, SupportMessage,
} = require('./supportAssociations');
const TeamInvitation = require('./TeamInvitation');
const CrawlJob = require('./CrawlJob');
const AuthToken = require('./AuthToken');
const MessageAttachment = require('./MessageAttachment');
const KnowledgeCollection = require('./KnowledgeCollection');
const KnowledgeAsset = require('./KnowledgeAsset');
const CommercialRequest = require('./CommercialRequest');
const CreditLedger = require('./CreditLedger');
const ConversationAlert = require('./ConversationAlert');
const ConversationLabel = require('./ConversationLabel');
const ConversationLabelAssignment = require('./ConversationLabelAssignment');
const ConversationReadReceipt = require('./ConversationReadReceipt');
const ConversationPageVisit = require('./ConversationPageVisit');
const Notification = require('./Notification');
const AgentAction = require('./AgentAction');
const AgentTurnUsage = require('./AgentTurnUsage');
const IntegrationConnector = require('./IntegrationConnector');
const IntegrationSyncJob = require('./IntegrationSyncJob');
const {
  defineAdminAssociations, AdminRole, AdminUser, AdminInvitation,
} = require('./adminAssociations');

// Définir les associations
const defineAssociations = () => {
  // Tenant associations
  Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users', onDelete: 'CASCADE' });
  Tenant.hasMany(KnowledgeBase, { foreignKey: 'tenantId', as: 'knowledgeBase', onDelete: 'CASCADE' });
  Tenant.hasMany(KnowledgeChunk, { foreignKey: 'tenantId', as: 'knowledgeChunks', onDelete: 'CASCADE' });
  Tenant.hasMany(Conversation, { foreignKey: 'tenantId', as: 'conversations', onDelete: 'CASCADE' });
  Tenant.hasMany(ChannelUser, { foreignKey: 'tenantId', as: 'channelUsers', onDelete: 'CASCADE' });
  Tenant.hasMany(MobilePushDevice, { foreignKey: 'tenantId', as: 'mobilePushDevices', onDelete: 'CASCADE' });
  Tenant.hasMany(TenantUsage, { foreignKey: 'tenantId', as: 'usage', onDelete: 'CASCADE' });
  Tenant.hasMany(PaymentTransaction, { foreignKey: 'tenantId', as: 'paymentTransactions', onDelete: 'CASCADE' });
  Tenant.hasMany(TeamInvitation, { foreignKey: 'tenantId', as: 'teamInvitations', onDelete: 'CASCADE' });
  Tenant.hasMany(AgentAction, { foreignKey: 'tenantId', as: 'agentActions', onDelete: 'CASCADE' });
  Tenant.hasMany(AgentTurnUsage, { foreignKey: 'tenantId', as: 'agentTurnUsage', onDelete: 'CASCADE' });
  AgentAction.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  AgentTurnUsage.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  AgentTurnUsage.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

  // User associations
  User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  User.hasMany(KnowledgeBase, { foreignKey: 'createdBy', as: 'createdKnowledge' });

  // KnowledgeBase associations
  KnowledgeBase.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  KnowledgeBase.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  Tenant.hasMany(KnowledgeCollection, { foreignKey: 'tenantId', as: 'knowledgeCollections', onDelete: 'CASCADE' });
  KnowledgeCollection.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  KnowledgeCollection.hasMany(KnowledgeBase, { foreignKey: 'collectionId', as: 'products' });
  KnowledgeBase.belongsTo(KnowledgeCollection, { foreignKey: 'collectionId', as: 'collection' });
  KnowledgeCollection.hasMany(KnowledgeAsset, { foreignKey: 'collectionId', as: 'sources' });
  KnowledgeAsset.belongsTo(KnowledgeCollection, { foreignKey: 'collectionId', as: 'collection' });
  KnowledgeBase.hasMany(KnowledgeAsset, { foreignKey: 'knowledgeBaseId', as: 'assets', onDelete: 'CASCADE' });
  KnowledgeAsset.belongsTo(KnowledgeBase, { foreignKey: 'knowledgeBaseId', as: 'product' });
  Tenant.hasMany(KnowledgeAsset, { foreignKey: 'tenantId', as: 'knowledgeAssets', onDelete: 'CASCADE' });

  Tenant.hasMany(CommercialRequest, { foreignKey: 'tenantId', as: 'commercialRequests', onDelete: 'CASCADE' });
  Tenant.hasMany(CreditLedger, { foreignKey: 'tenantId', as: 'creditEntries', onDelete: 'CASCADE' });
  Conversation.hasMany(CommercialRequest, { foreignKey: 'conversationId', as: 'commercialRequests', onDelete: 'CASCADE' });
  CommercialRequest.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
  CommercialRequest.belongsTo(KnowledgeBase, { foreignKey: 'knowledgeBaseId', as: 'product' });
  Tenant.hasMany(ConversationAlert, { foreignKey: 'tenantId', as: 'conversationAlerts', onDelete: 'CASCADE' });
  Conversation.hasMany(ConversationAlert, { foreignKey: 'conversationId', as: 'alerts', onDelete: 'CASCADE' });
  ConversationAlert.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
  Conversation.belongsTo(User, { foreignKey: 'assignedAgentId', as: 'assignedAgent' });
  Tenant.hasMany(ConversationLabel, { foreignKey: 'tenantId', as: 'conversationLabels', onDelete: 'CASCADE' });
  ConversationLabel.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  ConversationLabel.belongsToMany(Conversation, { through: ConversationLabelAssignment, foreignKey: 'labelId', otherKey: 'conversationId', as: 'conversations' });
  Conversation.belongsToMany(ConversationLabel, { through: ConversationLabelAssignment, foreignKey: 'conversationId', otherKey: 'labelId', as: 'labels' });
  Tenant.hasMany(ConversationReadReceipt, { foreignKey: 'tenantId', as: 'conversationReadReceipts', onDelete: 'CASCADE' });
  Conversation.hasMany(ConversationReadReceipt, { foreignKey: 'conversationId', as: 'readReceipts', onDelete: 'CASCADE' });
  ConversationReadReceipt.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Tenant.hasMany(ConversationPageVisit, { foreignKey: 'tenantId', as: 'conversationPageVisits', onDelete: 'CASCADE' });
  Conversation.hasMany(ConversationPageVisit, { foreignKey: 'conversationId', as: 'pageVisits', onDelete: 'CASCADE' });

  User.hasMany(TeamInvitation, { foreignKey: 'invitedBy', as: 'sentInvitations' });
  User.hasMany(PaymentTransaction, { foreignKey: 'initiatedByUserId', as: 'paymentTransactions', onDelete: 'SET NULL' });
  PaymentTransaction.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  PaymentTransaction.belongsTo(User, { foreignKey: 'initiatedByUserId', as: 'initiatedByUser' });

  // AuthToken associations
  User.hasMany(AuthToken, { foreignKey: 'userId', as: 'authTokens', onDelete: 'CASCADE' });
  AuthToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  KnowledgeBase.hasMany(KnowledgeChunk, { foreignKey: 'knowledgeBaseId', as: 'chunks', onDelete: 'CASCADE' });
  KnowledgeChunk.belongsTo(KnowledgeBase, { foreignKey: 'knowledgeBaseId', as: 'knowledgeBase' });
  KnowledgeChunk.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

  // Conversation associations
  Conversation.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

  // Pièces jointes des messages de conversation
  Tenant.hasMany(MessageAttachment, { foreignKey: 'tenantId', as: 'messageAttachments', onDelete: 'CASCADE' });
  Conversation.hasMany(MessageAttachment, { foreignKey: 'conversationId', as: 'attachments', onDelete: 'CASCADE' });
  MessageAttachment.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

  ChannelUser.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  MobilePushDevice.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  TenantUsage.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  TeamInvitation.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  TeamInvitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'inviter' });

  // CrawlJob associations
  Tenant.hasMany(CrawlJob, { foreignKey: 'tenantId', as: 'crawlJobs', onDelete: 'CASCADE' });
  CrawlJob.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  CrawlJob.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  CrawlJob.hasMany(KnowledgeBase, { foreignKey: 'crawlJobId', as: 'documents' });
  KnowledgeBase.belongsTo(CrawlJob, { foreignKey: 'crawlJobId', as: 'crawlJob' });
  Tenant.hasMany(IntegrationConnector, { foreignKey: 'tenantId', as: 'integrationConnectors', onDelete: 'CASCADE' });
  IntegrationConnector.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  IntegrationConnector.hasMany(IntegrationSyncJob, { foreignKey: 'connectorId', as: 'syncJobs', onDelete: 'CASCADE' });
  IntegrationSyncJob.belongsTo(IntegrationConnector, { foreignKey: 'connectorId', as: 'connector' });

  defineAdminAssociations();
  defineSupportAssociations();
};

// Initialiser les associations
defineAssociations();

// Regroupés par domaine plutôt qu'un nom par ligne : la liste se lit d'un coup
// d'œil et le fichier tient sous la limite de 250 lignes.
module.exports = {
  sequelize,
  // Cœur multi-tenant
  Tenant, User, TeamInvitation, TenantUsage, Plan, PaymentTransaction, AgentAction, AgentTurnUsage,
  // Conversations, canaux et pièces jointes
  Conversation, ConversationAlert, ConversationLabel, ConversationLabelAssignment, ConversationReadReceipt, ConversationPageVisit,
  Notification,
  ChannelUser, MobilePushDevice, MessageAttachment, CommercialRequest, CreditLedger,
  // Base de connaissances
  KnowledgeBase, KnowledgeChunk, KnowledgeCollection, KnowledgeAsset, CrawlJob,
  IntegrationConnector, IntegrationSyncJob,
  // Authentification
  AuthToken,
  // Plateforme d'administration
  AdminRole, AdminUser, AdminInvitation,
  // Support
  SupportTicket, SupportMessage,
};
