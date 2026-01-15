'use client';

import { useEffect, useState } from 'react';
import { getKnowledgeStats } from '@/lib/api/knowledge';
import type { KnowledgeStats as KnowledgeStatsType } from '@/lib/types/knowledge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function KnowledgeStats() {
  const [stats, setStats] = useState<KnowledgeStatsType | null>(null);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>知识库统计</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>知识库统计</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">错误: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>知识库统计</CardTitle>
        <CardDescription>知识库的基本信息和状态</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">风格总数</p>
            <p className="text-2xl font-bold">{stats.count}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">向量维度</p>
            <p className="text-2xl font-bold">{stats.dimension}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">初始化状态</p>
            <p className="text-2xl font-bold">{stats.initialized ? '✓' : '✗'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">数据库状态</p>
            <p className="text-2xl font-bold">{stats.dbExists ? '✓' : '✗'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
