'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StyleData } from '@/lib/types/knowledge';
import { Badge } from '@/components/ui/badge';

interface StyleDetailProps {
  style: StyleData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StyleDetail({ style, open, onOpenChange }: StyleDetailProps) {
  if (!style) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{style.style}</DialogTitle>
          {style.description && <DialogDescription>{style.description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Prompt</h4>
            <p className="text-sm text-muted-foreground">{style.prompt}</p>
          </div>
          {style.tags && style.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">标签</h4>
              <div className="flex flex-wrap gap-1">
                {style.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {style.metadata && (
            <div>
              <h4 className="text-sm font-medium mb-2">元数据</h4>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                {JSON.stringify(style.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
