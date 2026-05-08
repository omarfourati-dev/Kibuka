export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface FeatureFlags {
  enableAi: boolean;
  enableRag: boolean;
  enableAgents: boolean;
  enableBilling: boolean;
  enableMultiTenant: boolean;
  enableWebsockets: boolean;
  enableAiCodeEditor: boolean;
}
