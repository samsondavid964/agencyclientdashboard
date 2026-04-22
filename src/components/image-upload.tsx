"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  currentUrl: string | null;
  fallback: string;
  onUpload: (formData: FormData) => Promise<{ error?: string; success?: boolean; avatarUrl?: string; logoUrl?: string }>;
  fieldName: string;
  size?: "sm" | "md" | "lg";
  /** Accessible label — defaults to a generic "Upload image" if not provided. */
  ariaLabel?: string;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

const sizeClasses = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-24 w-24",
};

const textSizes = {
  sm: "text-sm",
  md: "text-xl",
  lg: "text-2xl",
};

export function ImageUpload({
  currentUrl,
  fallback,
  onUpload,
  fieldName,
  size = "md",
  ariaLabel = "Upload image",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File must be under 2MB.");
      e.target.value = "";
      return;
    }

    // Show local preview immediately.
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const formData = new FormData();
    formData.append(fieldName, file);

    startTransition(async () => {
      try {
        const result = await onUpload(formData);
        if (result.error) {
          toast.error(result.error);
          setPreview(currentUrl);
        } else {
          toast.success("Image updated!");
          const newUrl = result.avatarUrl || result.logoUrl;
          if (newUrl) setPreview(newUrl);
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  };

  return (
    <div className={`relative ${sizeClasses[size]} shrink-0`}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        aria-label={ariaLabel}
        aria-busy={isPending || undefined}
        className={`group relative h-full w-full overflow-hidden rounded-full ring-2 ring-border transition-all hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70`}
      >
        {preview ? (
          <Image
            src={preview}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-muted ${textSizes[size]} font-semibold text-muted-foreground`}
            aria-hidden="true"
          >
            {fallback}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
          ) : (
            <Camera className="h-5 w-5 text-white" aria-hidden="true" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
        disabled={isPending}
        tabIndex={-1}
      />
    </div>
  );
}
