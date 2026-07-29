import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-button font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-sm',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/50',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-accent/50',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 shadow-sm'
      },
      size: {
        default: 'h-[42px] px-4 py-2',
        sm: 'h-[36px] rounded-lg px-3 py-1.5 text-sm',
        lg: 'h-[42px] rounded-lg px-4 py-2',
        icon: 'h-10 w-10 rounded-lg',
        fullWidth: 'h-[42px] w-full rounded-lg px-4 py-2'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
