// frontend/src/services/api.js
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export const api = {
  // Prospects
  async getProspects(params = {}) {
    // Si params ne contient pas limit, on le laisse vide pour que le backend renvoie tout
    // Si une limite est spécifiée, on la garde
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}/prospects${query ? '?' + query : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur lors du chargement des prospects');
    return response.json();
  },

  async getProspectsWithLimit(limit = 250, params = {}) {
    // Fonction dédiée si on veut spécifier une limite
    const query = new URLSearchParams({ limit, ...params }).toString();
    const url = `${API_BASE}/prospects${query ? '?' + query : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur lors du chargement des prospects');
    return response.json();
  },

  async getPriorityProspects(limit = 10) {
    const response = await fetch(`${API_BASE}/prospects/priority?limit=${limit}`);
    if (!response.ok) throw new Error('Erreur lors du chargement des prospects prioritaires');
    return response.json();
  },

  async createProspect(data) {
    const response = await fetch(`${API_BASE}/prospects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Erreur lors de la création du prospect');
    return response.json();
  },

  async getProspect(id) {
    const response = await fetch(`${API_BASE}/prospects/${id}`);
    if (!response.ok) throw new Error('Prospect non trouvé');
    return response.json();
  },

  async updateProspect(id, data) {
    const response = await fetch(`${API_BASE}/prospects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Erreur lors de la mise à jour');
    return response.json();
  },

  async deleteProspect(id) {
    const response = await fetch(`${API_BASE}/prospects/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Erreur lors de la suppression');
    return response.json();
  },

  async scrapeFrenchMarket(payload) {
    const response = await fetch(`${API_BASE}/prospects/scrape-french-market`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Erreur lors du scraping');
    return data;
  },

  async rescoreAll() {
    const response = await fetch(`${API_BASE}/prospects/rescore-all`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Erreur lors du recalcul des scores');
    return response.json();
  },

  async clearAll() {
    const response = await fetch(`${API_BASE}/prospects/clear-all`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Erreur lors de la réinitialisation');
    return response.json();
  },

  // Calls & Voice Bot
  async getCalls(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}/calls${query ? '?' + query : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur lors du chargement des appels');
    return response.json();
  },

  async initiateVirtualCall(data) {
    const response = await fetch(`${API_BASE}/calls/virtual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Erreur lors de l\'appel virtuel');
    return result;
  },

  async voiceInteract(data) {
    const response = await fetch(`${API_BASE}/calls/voice-interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Erreur interaction vocale');
    return result;
  },

  async getCallStats() {
    const response = await fetch(`${API_BASE}/calls/stats/overview`);
    if (!response.ok) throw new Error('Erreur statistiques appels');
    return response.json();
  },

  async getCallTranscript(callId) {
    const response = await fetch(`${API_BASE}/calls/${callId}/transcript`);
    if (!response.ok) throw new Error('Erreur transcription');
    return response.json();
  },

  // Analytics
  async getDashboardAnalytics(period = '30d') {
    const response = await fetch(`${API_BASE}/analytics/dashboard?period=${period}`);
    if (!response.ok) throw new Error('Erreur analytics dashboard');
    return response.json();
  },

  async getProspectsDistribution() {
    const response = await fetch(`${API_BASE}/analytics/prospects-distribution`);
    if (!response.ok) throw new Error('Erreur distribution');
    return response.json();
  },

  async getCallsTrend(period = '30d') {
    const response = await fetch(`${API_BASE}/analytics/calls-trend?period=${period}`);
    if (!response.ok) throw new Error('Erreur tendance appels');
    return response.json();
  },

  // Scheduler 08h00
  async getSchedulerStatus() {
    const response = await fetch(`${API_BASE}/scheduler/status`);
    if (!response.ok) throw new Error('Erreur statut planificateur');
    return response.json();
  },

  async triggerSchedulerNow() {
    const response = await fetch(`${API_BASE}/scheduler/trigger-now`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Erreur déclenchement planificateur');
    return response.json();
  },

  // Export CSV (nouveau)
  async exportProspectsCSV(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}/prospects/export/csv${query ? '?' + query : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur lors de l\'export CSV');
    return response.text();
  },

  // Statistiques par profession (nouveau)
  async getProfessionStats() {
    const response = await fetch(`${API_BASE}/analytics/profession-stats`);
    if (!response.ok) throw new Error('Erreur statistiques par profession');
    return response.json();
  },

  // Scraper avec professions spécifiques (nouveau)
  async scrapeSpecificProfessions(payload) {
    const response = await fetch(`${API_BASE}/prospects/scrape-specific`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Erreur lors du scraping spécifique');
    return data;
  }
};