'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

type AlertDialogVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: AlertDialogVariant;
  title: string;
  message: string;
  autoCloseDuration?: number; // in milliseconds
  onClose?: () => void;
}

const variantConfig: Record<
  AlertDialogVariant,
  {
    icon: ReactNode;
    buttonClass: string;
    titleClass: string;
  }
> = {
  success: {
    icon: <CheckCircle className="h-12 w-12 text-emerald-600" />,
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
    titleClass: 'text-emerald-900'
  },
  error: {
    icon: <XCircle className="h-12 w-12 text-red-600" />,
    buttonClass: 'bg-red-600 hover:bg-red-700',
    titleClass: 'text-red-900'
  },
  warning: {
    icon: <AlertCircle className="h-12 w-12 text-amber-600" />,
    buttonClass: 'bg-amber-600 hover:bg-amber-700',
    titleClass: 'text-amber-900'
  },
  info: {
    icon: <AlertCircle className="h-12 w-12 text-blue-600" />,
    buttonClass: 'bg-blue-600 hover:bg-blue-700',
    titleClass: 'text-blue-900'
  }
};

export function AlertDialog({
  open,
  onOpenChange,
  variant = 'info',
  title,
  message,
  autoCloseDuration,
  onClose
}: AlertDialogProps) {
  const [isOpen, setIsOpen] = useState(open);
  const config = variantConfig[variant];

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    if (isOpen && autoCloseDuration && variant === 'success') {
      const timer = setTimeout(() => {
        setIsOpen(false);
        onOpenChange(false);
        onClose?.();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDuration, variant, onOpenChange, onClose]);

  const handleClose = () => {
    setIsOpen(false);
    onOpenChange(false);
    onClose?.();
  };

  return (
    <Dialog
      open={isOpen}
      title={title}
      onOpenChange={(newOpen) => {
        setIsOpen(newOpen);
        onOpenChange(newOpen);
        if (!newOpen) onClose?.();
      }}
    >
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex justify-center">{config.icon}</div>

        <div className="text-center">
          <h2 className={`text-xl font-bold ${config.titleClass}`}>{title}</h2>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>

        <div className="mt-4 flex gap-3 w-full justify-center">
          {variant === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Go Back
              </Button>
              <Button className={config.buttonClass} onClick={handleClose}>
                Got it
              </Button>
            </>
          )}
          {variant === 'success' && (
            <Button className={config.buttonClass} onClick={handleClose}>
              Continue
            </Button>
          )}
          {(variant === 'warning' || variant === 'info') && (
            <Button className={config.buttonClass} onClick={handleClose}>
              Okay
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
