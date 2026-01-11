'use client';

import { useEffect, useState } from 'react';
import { getStyles, searchStyles } from '@/lib/api/knowledge';
import type { StyleData } from '@/lib/types/knowledge';
import { StyleCard } from './StyleCard';
import { Card, CardContent } from '@/components/ui/card';

interface StyleListProps {
  searchQuery?: string;
  onStyleClick?: (style: StyleData) => void;
}

export function StyleList({ searchQuery, onStyleClick }: StyleListProps) {
  const [styles, setStyles] = useState<StyleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadStyles() {
      try {
        setLoading(true);
        setError(null);

        let data: StyleData[];
        if (searchQuery && searchQuery.trim()) {
          const results = await searchStyles({ query: searchQuery });
          // 将搜索结果转换为 StyleData 格式
          data = results.map((r, index) => ({
            id: `search-${index}`,
            style: r.style,
            prompt: r.prompt,
            metadata: r.metadata,
          }));
        } else {
          data = await getStyles();
        }

        setStyles(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('加载失败'));
      } finally {
        setLoading(false);
      }
    }

    loadStyles();
  }, [searchQuery]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">加载中...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">错误: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (styles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {searchQuery ? '未找到相关风格' : '暂无风格数据'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {styles.map((style) => (
        <StyleCard
          key={style.id}
          style={style}
          onClick={() => onStyleClick?.(style)}
        />
      ))}
    </div>
  );
}
