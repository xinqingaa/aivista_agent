import { fetchAPI, API_ENDPOINTS } from './client';
import type {
  StyleData,
  SearchOptions,
  SearchResult,
  KnowledgeStats,
  CreateStyleRequest,
  CreateStyleResponse,
} from '@/lib/types/knowledge';

export async function getStyles(): Promise<StyleData[]> {
  return fetchAPI<StyleData[]>(API_ENDPOINTS.KNOWLEDGE.STYLES);
}

export async function getStyleById(id: string): Promise<StyleData> {
  return fetchAPI<StyleData>(API_ENDPOINTS.KNOWLEDGE.STYLE_BY_ID(id));
}

export async function searchStyles(options: SearchOptions): Promise<SearchResult[]> {
  return fetchAPI<SearchResult[]>(API_ENDPOINTS.KNOWLEDGE.SEARCH, {
    params: {
      query: options.query,
      ...(options.limit && { limit: options.limit }),
      ...(options.minSimilarity && { minSimilarity: options.minSimilarity }),
    },
  });
}

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  return fetchAPI<KnowledgeStats>(API_ENDPOINTS.KNOWLEDGE.STATS);
}

export async function createStyle(data: CreateStyleRequest): Promise<CreateStyleResponse> {
  return fetchAPI<CreateStyleResponse>(API_ENDPOINTS.KNOWLEDGE.STYLES, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
