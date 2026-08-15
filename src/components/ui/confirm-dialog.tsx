'use client';

import { useLocale } from '@/i18n/provider';
import { Button } from './button';
import { Dialog } from './dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmDialogProps) {
  const { dict } = useLocale();
  const resolvedConfirmText = confirmText ?? dict.common.confirm;
  const resolvedCancelText = cancelText ?? dict.common.cancel;

  const handleClose = () => {
    onOpenChange(false);
    onCancel?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <div className="space-y-4 py-4">
        <p className="text-sm leading-6 text-slate-600">{description}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            {resolvedCancelText}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? dict.common.processing : resolvedConfirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
