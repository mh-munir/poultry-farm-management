import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';

export { Card };
