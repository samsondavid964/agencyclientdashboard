"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { uploadClientLogo } from "@/lib/actions/profile";
import { getInitials } from "@/lib/utils/initials";

interface ClientLogoUploadProps {
  clientId: string;
  currentLogoUrl: string | null;
  clientName: string;
  isAdmin: boolean;
}

export function ClientLogoUpload({
  clientId,
  currentLogoUrl,
  clientName,
  isAdmin,
}: ClientLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const initials = getInitials(clientName);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("File must be a JPG, PNG, WebP, or GIF image.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const formData = new FormData();
    formData.append("logo", file);

    startTransition(async () => {
      try {
        const result = await uploadClientLogo(clientId, formData);
        if (result?.error) {
          toast.error(result.error);
          setPreview(currentLogoUrl);
          return;
        }

        toast.success("Client logo updated!");
        if (result?.logoUrl) {
          setPreview(result.logoUrl);
        }
        router.refresh();
      } catch {
        toast.error("Failed to upload logo.");
        setPreview(currentLogoUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
        // Reset the input so picking the same file again re-triggers onChange.
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  };

  const content = preview ? (
    <Image
      src={preview}
      alt={clientName}
      width={48}
      height={48}
      className="h-12 w-12 object-cover"
    />
  ) : (
    <span className="text-lg font-semibold text-muted-foreground">
      {initials}
    </span>
  );

  if (!isAdmin) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        {content}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-all hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        disabled={isPending}
        aria-label={`Change logo for ${clientName}`}
        title="Accepts JPG, PNG, WebP up to 2MB"
      >
        {content}
        {isPending ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Camera className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
        )}
        <span className="sr-only">
          {isPending ? "Uploading logo…" : "Upload new logo"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
        disabled={isPending}
      />
    </>
  );
}
