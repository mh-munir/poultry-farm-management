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

export function useModalSave(): {
  isSaving: boolean;
  saveError: string;
  save: <T extends ModalSaveResult>(action: () => Promise<T>, options?: UseModalSaveOptions<T>) => Promise<T>;
};
