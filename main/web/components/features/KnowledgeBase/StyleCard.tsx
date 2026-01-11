'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { StyleData } from '@/lib/types/knowledge';
import { Badge } from '@/components/ui/badge';

interface StyleCardProps {
  style: StyleData;
  onClick?: () => void;
}

export function StyleCard({ style, onClick }: StyleCardProps) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="text-lg">{style.style}</CardTitle>
        {style.description && <CardDescription>{style.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{style.prompt}</p>
        {style.tags && style.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {style.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {style.metadata?.popularity && (
          <div className="mt-2 text-xs text-muted-foreground">
            流行度: {style.metadata.popularity}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
