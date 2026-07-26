'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import AdminImageUploader from '@/components/admin-image-uploader';
import { updateAdminCredentials } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';

type Props = {
  currentName: string;
  currentEmail: string;
  currentImage: string;
};

export default function AdminCredentialsForm({ currentName, currentEmail, currentImage }: Props) {
  const { success: showToastSuccess, error: showToastError } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleFormAction(_prev: unknown, formData: FormData) {
    const result = await updateAdminCredentials(formData);
    if (result.success) {
      showToastSuccess(result.success);
      setIsSuccess(true);
    } else if (result.error) {
      showToastError(result.error);
    }
    return result;
  }

  const [state, formAction] = useActionState(handleFormAction, null);

  function handleSubmit() {
    setIsSuccess(false);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
            Admin name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={currentName}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Upload image</label>
          <AdminImageUploader
            existingImageUrl={currentImage}
            onImageUploaded={(url) => {}}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Admin email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={currentEmail}
          required
          className="w-full rounded-md border bg-background px-3 py-2"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Leave blank to keep current password"
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Repeat new password"
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-muted p-4 text-sm text-slate-600">
        <p className="font-medium">Security note</p>
        <p className="mt-2">
          Updating this form will change the current administrator account. If you only want to update the email address or name, leave both password fields blank.
        </p>
      </div>

      <Button type="submit" disabled={isSuccess}>
        {isSuccess ? 'Saved!' : 'Save admin credentials'}
      </Button>
    </form>
  );
}