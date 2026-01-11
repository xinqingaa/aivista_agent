import { useState, useEffect } from 'react';
import { getStyles, searchStyles, getKnowledgeStats } from '@/lib/api/knowledge';
import type { StyleData, SearchOptions, KnowledgeStats } from '@/lib/types/knowledge';

export function useStyles() {
  const [styles, setStyles] = useState<StyleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadStyles() {
      try {
        setLoading(true);
        setError(null);
        const data = await getStyles();
        setStyles(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('加载失败'));
      } finally {
        setLoading(false);
      }
    }

    loadStyles();
  }, []);

  return { styles, loading, error, refetch: () => {} };
}

export function useSearchStyles(options: SearchOptions) {
  const [results, setResults] = useState<StyleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function search() {
      if (!options.query || !options.query.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await searchStyles(options);
        // 将搜索结果转换为 StyleData 格式
        const converted = data.map((r, index) => ({
          id: `search-${index}`,
          style: r.style,
          prompt: r.prompt,
          metadata: r.metadata,
        }));
        setResults(converted);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('搜索失败'));
      } finally {
        setLoading(false);
      }
    }

    search();
  }, [options.query, options.limit, options.minSimilarity]);

  return { results, loading, error };
}

export function useKnowledgeStats() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        setError(null);
        const data = await getKnowledgeStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('加载失败'));
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return { stats, loading, error, refetch: () => {} };
}
