import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h1 className="text-4xl font-bold">AiVista Web</h1>
        <p className="text-muted-foreground text-center max-w-md">
          欢迎使用 AiVista Web 前端应用
        </p>
        <div className="flex gap-4">
          <Link href="/knowledge">
            <Button>知识库管理</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
