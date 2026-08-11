import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md',
      className
    )}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';

export { Card };
