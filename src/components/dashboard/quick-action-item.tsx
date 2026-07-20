import Link from 'next/link';
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionItemProps {
  label: string;
  href: string | URL;
  icon: LucideIcon;
}

export function QuickActionItem({ label, href, icon: Icon }: QuickActionItemProps) {
  const linkHref = href as any;

  return (
    <Button asChild variant="outline" className="justify-between">
      <Link href={linkHref} className="flex w-full items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" /> {label}
        </span>
      </Link>
    </Button>
  );
}
