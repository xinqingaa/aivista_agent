'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface StyleSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export function StyleSearch({ query, onQueryChange }: StyleSearchProps) {
  const [input, setInput] = useState(query);
  const debouncedQuery = useDebounce(input, 300);

  useEffect(() => {
    onQueryChange(debouncedQuery);
  }, [debouncedQuery, onQueryChange]);

  return (
    <div className="relative">
      <Input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="搜索风格..."
        className="w-full pr-10"
      />
      {input && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full"
          onClick={() => {
            setInput('');
            onQueryChange('');
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
