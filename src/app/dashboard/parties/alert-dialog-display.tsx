'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertDialog } from '@/components/ui/alert-dialog';

interface AlertDialogDisplayProps {
  error?: string;
  success?: string;
}

export function AlertDialogDisplay({ error, success }: AlertDialogDisplayProps) {
  const router = useRouter();
  const [showError, setShowError] = useState(!!error);
  const [showSuccess, setShowSuccess] = useState(!!success);

  useEffect(() => {
    setShowError(!!error);
    setShowSuccess(!!success);
  }, [error, success]);

  const handleErrorClose = () => {
    setShowError(false);
    router.push('/dashboard/parties');
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    router.push('/dashboard/parties');
  };

  return (
    <>
      <AlertDialog
        open={showError}
        onOpenChange={setShowError}
        variant="error"
        title="Unable to Save Party"
        message={error || ''}
        onClose={handleErrorClose}
      />

      <AlertDialog
        open={showSuccess}
        onOpenChange={setShowSuccess}
        variant="success"
        title="Success!"
        message={success || ''}
        autoCloseDuration={2000}
        onClose={handleSuccessClose}
      />
    </>
  );
}
