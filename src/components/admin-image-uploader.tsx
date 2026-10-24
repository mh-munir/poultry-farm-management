'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { useLocale } from '@/i18n/provider';

type Props = {
  existingImageUrl?: string | null;
  inputId?: string;
  onFileSelected?: (file: File | null) => void;
  onImageUploaded?: (url: string) => void;
};

export default function AdminImageUploader({ existingImageUrl, inputId = 'imageFile', onFileSelected, onImageUploaded }: Props) {
  const { dict } = useLocale();
  const [preview, setPreview] = useState<string | null>(existingImageUrl ?? null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(existingImageUrl ?? null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreview(existingImageUrl ?? null);
    setCurrentImageUrl(existingImageUrl ?? null);

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
      setCurrentImageUrl(uploadedUrl);
      onImageUploaded?.(uploadedUrl);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative rounded-full border border-green-100 bg-green-50 p-1.5 shadow-sm">
        {preview ? (
          <img src={preview} alt={dict.settings.profilePhoto} className="h-28 w-28 rounded-full object-cover sm:h-32 sm:w-32" />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-green-100 text-4xl font-semibold text-green-700 sm:h-32 sm:w-32">A</div>
        )}
        <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-green-600 text-white shadow"><Camera className="h-4 w-4" /></span>
      </div>
      <label htmlFor={inputId} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50">
        <Upload className="h-4 w-4" />{uploading ? dict.settings.uploadingImage : dict.settings.changePhoto}
      </label>
      <p className="mt-2 text-xs text-slate-500">{dict.settings.imageSizeHint}</p>
      <input ref={inputRef} id={inputId} name="imageFile" type="file" accept="image/*" onChange={onFileChange} className="sr-only" disabled={uploading} />
      <input type="hidden" name="existingImageUrl" value={currentImageUrl ?? ''} />
    </div>
  );
}
