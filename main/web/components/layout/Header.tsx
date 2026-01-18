'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <span
              className={cn(
                'font-bold transition-colors',
                pathname === '/' ? 'text-foreground' : 'text-foreground/60 hover:text-foreground/80'
              )}
            >
              AiVista
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/chat"
              className={cn(
                'transition-colors',
                pathname === '/chat'
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              AI 智绘
            </Link>
            <Link
              href="/knowledge"
              className={cn(
                'transition-colors',
                pathname === '/knowledge'
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              知识库
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-2">
          <FullscreenToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
