'use client';

import React, { useEffect, useRef, useState } from 'react';

type Props = {
  existingImageUrl?: string | null;
};

export default function AdminImageUploader({ existingImageUrl }: Props) {
  const [preview, setPreview] = useState<string | null>(existingImageUrl ?? null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPreview(existingImageUrl ?? null);

    return () => {
      // revoke object URL when unmounting
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [existingImageUrl]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setPreview(existingImageUrl ?? null);
    const url = URL.createObjectURL(file);
    setPreview(url);
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
