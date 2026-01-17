export interface StyleData {
  id: string;
  style: string;
  prompt: string;
  description?: string;
  tags?: string[];
  metadata?: {
    category?: string;
    popularity?: number;
    [key: string]: any;
  };
  isSystem?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  minSimilarity?: number;
}

export interface SearchResult {
  style: string;
  prompt: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface KnowledgeStats {
  count: number;
  dimension: number;
  dbPath: string;
  tableName: string;
  initialized: boolean;
  dbExists: boolean;
  tableInitialized: boolean;
}

export interface CreateStyleRequest {
  style: string;
  prompt: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CreateStyleResponse {
  id: string;
  style: string;
  prompt: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateStyleRequest {
  style?: string;
  prompt?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface BatchDeleteRequest {
  ids: string[];
}

export interface BatchDeleteResponse {
  deleted: number;
  failed: string[];
}
