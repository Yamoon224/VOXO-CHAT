// widget/src/api.js - Client API pour le widget
import { translate } from './i18n.js';
export class ChatAPI {
  constructor(baseUrl, tenantId, locale = 'fr') {
    this.baseUrl = (baseUrl || 'http://invalid').replace(/\/$/, ''); // Les appels réels sont bloqués au bootstrap sans URL API.
    this.tenantId = tenantId;
    this.locale = locale;
    this.timeout = 30000; // 30 secondes
  }

  async sendMessage(messageData) {
    const response = await this.fetch('/widget/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': this.tenantId },
      body: JSON.stringify(messageData)
    });
    return response.json();
  }

  async uploadAttachment(file) {
    const body = new FormData();
    body.append('file', file);

    // Pas d'en-tête Content-Type : le navigateur doit poser lui-même le boundary.
    const response = await this.fetch('/widget/upload', {
      method: 'POST', headers: { 'X-Tenant-ID': this.tenantId }, body
    }, 120000);

    return response.json();
  }

  async getConversationHistory(sessionId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/widget/conversation/${sessionId}${queryParams ? `?${queryParams}` : ''}`;
    const response = await this.fetch(url, { headers: { 'X-Tenant-ID': this.tenantId } });
    return response.json();
  }

  async endConversation(sessionId, feedback = {}) {
    const response = await this.fetch(`/widget/conversation/${sessionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': this.tenantId },
      body: JSON.stringify(feedback)
    });
    return response.json();
  }

  conversationSocketUrl(sessionId) {
    const base = this.baseUrl.replace(/^http/, 'ws');
    return `${base}/widget/conversation/${encodeURIComponent(sessionId)}/socket?tenantId=${encodeURIComponent(this.tenantId)}`;
  }

  async endConversationForInactivity(sessionId, metadata = {}) {
    const response = await this.fetch(`/widget/conversation/${sessionId}/timeout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': this.tenantId },
      body: JSON.stringify(metadata)
    });
    return response.json();
  }

  async sendMessageFeedback(sessionId, payload) {
    const response = await this.fetch(`/widget/conversation/${sessionId}/message-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': this.tenantId },
      body: JSON.stringify(payload)
    });
    return response.json();
  }

  async getTenantSettings() {
    const response = await this.fetch('/widget/config', { headers: { 'X-Tenant-ID': this.tenantId } });
    return response.json();
  }

  async getQuickReplies(category = 'greeting') {
    const response = await this.fetch(`/widget/quick-replies?category=${category}`, {
      headers: { 'X-Tenant-ID': this.tenantId }
    });
    return response.json();
  }

  // Méthode fetch avec timeout et gestion d'erreurs
  async fetch(endpoint, options = {}, timeout = this.timeout) {
    const url = `${this.baseUrl}${endpoint}`;

    // Ajouter un timeout
    const controller = timeout > 0 ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeout) : null;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 'Accept-Language': this.locale, ...(options.headers || {}) },
        signal: options.signal || controller?.signal
      });

      if (timeoutId) clearTimeout(timeoutId);

      // Vérifier le statut de la réponse
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.code = errorData.code;
        error.details = errorData.details;
        throw error;
      }

      return response;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(translate(this.locale, 'timeout'));
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        throw new Error(translate(this.locale, 'network'));
      }
      
      throw error;
    }
  }

  // Test de connectivité
  async healthCheck() {
    try {
      const response = await this.fetch('/widget/health', { headers: { 'X-Tenant-ID': this.tenantId } });
      return await response.json();
    } catch (error) { return { healthy: false, error: error.message }; }
  }
}
