'use client';

import React, { useEffect, useRef, useState } from 'react';

type Props = {
  existingImageUrl?: string | null;
  onFileSelected?: (file: File | null) => void;
  onImageUploaded?: (url: string) => void;
};

export default function AdminImageUploader({ existingImageUrl, onFileSelected, onImageUploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(existingImageUrl ?? null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreview(existingImageUrl ?? null);

    return () => {
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [existingImageUrl]);

  async function handleFileUpload(file: File): Promise<string | null> {
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('imageFile', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data?.url) {
        return data.url;
      }
      return null;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setPreview(existingImageUrl ?? null);
    if (!file.type.startsWith('image/')) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    try {
      onFileSelected?.(file ?? null);
    } catch {}

    const uploadedUrl = await handleFileUpload(file);
    if (uploadedUrl) {
      setPreview(uploadedUrl);
      onImageUploaded?.(uploadedUrl);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div>
      <div className="mb-2">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="h-24 w-24 rounded-full object-cover border shadow-sm" />
        ) : (
          <div className="h-24 w-24 rounded-full border bg-muted text-3xl font-semibold text-muted-foreground flex items-center justify-center">A</div>
        )}
      </div>

      <input ref={inputRef} id="imageFile" name="imageFile" type="file" accept="image/*" onChange={onFileChange} className="w-full rounded-md border bg-background px-3 py-2" />
      <input type="hidden" name="existingImageUrl" value={existingImageUrl ?? ''} />
    </div>
  );
}
