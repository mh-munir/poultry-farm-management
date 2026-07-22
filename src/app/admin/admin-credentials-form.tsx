'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import AdminImageUploader from '@/components/admin-image-uploader';
import { updateAdminCredentials } from './actions';

type Props = {
  currentName: string;
  currentEmail: string;
  currentImage: string;
};

type UpdateAdminResult = {
  success?: string;
  error?: string;
  newImageUrl?: string | null;
  newName?: string | null;
};

export default function AdminCredentialsForm({ currentName, currentEmail, currentImage }: Props) {
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [imageUrl, setImageUrl] = useState(currentImage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit() {
    setIsSubmitting(true);
  }

  return (
      <form action={updateAdminCredentials} onSubmit={handleSubmit} encType="multipart/form-data" className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
              Admin name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Upload image</label>
            <AdminImageUploader existingImageUrl={imageUrl} />
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save admin credentials'}
        </Button>
      </form>
    );
}
