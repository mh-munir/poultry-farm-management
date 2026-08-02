import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-button font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:w-auto md:w-auto',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/95 active:bg-primary/90 shadow-sm',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 active:bg-secondary/80 shadow-sm',
        outline: 'border border-input bg-white hover:bg-slate-50 active:bg-slate-100',
        ghost: 'hover:bg-slate-100 active:bg-slate-200',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/95 active:bg-destructive/90 shadow-sm'
      },
      size: {
        default: 'min-h-[48px] h-auto px-5',
        sm: 'min-h-[42px] h-auto rounded-[12px] px-4 text-sm',
        lg: 'min-h-[52px] h-auto rounded-[12px] px-6',
        icon: 'h-[48px] w-[48px] rounded-[12px]',
        fullWidth: 'min-h-[48px] h-auto w-full rounded-[12px] px-5',
        responsive: 'w-full sm:w-auto min-h-[48px] h-auto px-5'
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
