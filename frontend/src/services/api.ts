import axios from 'axios';
import { PullRequest, PRAnalysis, WebhookEvent, Settings, Repository, RepoAnalysisMetrics } from '../types';

// Use Vite env when provided; fall back to relative path to leverage dev proxy
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  total_prs: number;
  open_prs: number;
  merged_prs: number;
  closed_prs: number;
  total_analyses: number;
  avg_processing_time: number;
  recent_events: WebhookEvent[];
  repo_metrics?: RepoAnalysisMetrics | null;
}

// Pull Requests API
export const pullRequestsApi = {
  getAll: async (params?: {
    status?: string;
    repository?: string;
    author?: string;
    search?: string;
    refresh?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PullRequest>> => {
    const response = await api.get('/prs', { params });
    return response.data;
  },

  getById: async (id: number): Promise<PullRequest> => {
    const response = await api.get(`/prs/${id}`);
    return response.data;
  },

  getAnalysis: async (id: number): Promise<PRAnalysis> => {
    const response = await api.get(`/prs/${id}/analysis`);
    return response.data;
  },
};

// Events API
export const eventsApi = {
  getAll: async (params?: {
    type?: string;
    limit?: number;
  }): Promise<WebhookEvent[]> => {
    const response = await api.get('/events', { params });
    return response.data;
  },
};

// Settings API
export const settingsApi = {
  get: async (): Promise<Settings> => {
    const response = await api.get('/settings');
    return response.data;
  },

  update: async (settings: Partial<Settings>): Promise<Settings> => {
    const response = await api.put('/settings', settings);
    return response.data;
  },
};

// Repositories API
export const repositoriesApi = {
  getAll: async (): Promise<Repository[]> => {
    const response = await api.get('/repositories');
    return response.data;
  },
};

// Repository Scan API
export const repoScanApi = {
  scan: async (payload: { repoUrl: string; owner?: string; repo?: string; options?: any }) => {
    const response = await api.post('/repositories/scan', payload);
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/stats');
    return response.data;
  },
};

export default api;
