'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyServerActionError, handleStaleServerActionError } from '@/lib/server-action-errors';

export type ModalSaveResult = {
  success: boolean;
  message: string;
};

export type UseModalSaveOptions<T extends ModalSaveResult = ModalSaveResult> = {
  onSuccess?: (result: T) => void;
  onClose?: () => void;
  onReset?: () => void;
  refreshOnSuccess?: boolean;
  successMessage?: string;
  defaultErrorMessage?: string;
};

export function useModalSave() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const save = useCallback(
    async <T extends ModalSaveResult>(
      action: () => Promise<T>,
      options: UseModalSaveOptions<T> = {}
    ) => {
      setSaveError('');
      setIsSaving(true);

      try {
        const result = await action();

        if (!result.success) {
          const errorMessage = result.message || options.defaultErrorMessage || 'Unable to save changes.';
          setSaveError(errorMessage);
          showError(errorMessage);
          return result;
        }

        success(options.successMessage || result.message);

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        if (options.refreshOnSuccess) {
          router.refresh();
        }

        if (options.onReset) {
          options.onReset();
        }

        if (options.onClose) {
          options.onClose();
        }

        return result;
      } catch (error) {
        const staleHandled = handleStaleServerActionError(error, showError);
        const message = staleHandled
          ? 'A new version of the application is available. Please refresh the page and try again.'
          : getFriendlyServerActionError(error) || options.defaultErrorMessage || 'Unable to save changes.';

        if (!staleHandled) {
          setSaveError(message);
          showError(message);
        }

        return { success: false, message } as T;
      } finally {
        setIsSaving(false);
      }
    },
    [router, success, showError]
  );

  return { isSaving, saveError, save };
}
