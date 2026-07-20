import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-slate-200/70 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-[1px] hover:shadow-md',
      className
    )}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';

export { Card };
