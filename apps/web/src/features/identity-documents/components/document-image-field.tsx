import { Button } from "@tattvix/ui/components/button";
import { Label } from "@tattvix/ui/components/label";
import { Camera, CheckCircle2, Eye, ImageUp, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  compressImage,
  ImageDecodeError,
  UPLOADABLE_IMAGE_TYPES,
} from "@/features/identity-documents/compress-image";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export type ImageSelection =
  | { status: "processing" }
  | { status: "ready"; file: File; originalSize: number };

export function DocumentImageField({
  name,
  label,
  required,
  uploaded,
  selection,
  error,
  isAccessPending,
  onSelectionChange,
  onError,
  onView,
}: {
  name: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  selection: ImageSelection | null;
  error?: string;
  isAccessPending: boolean;
  onSelectionChange: (selection: ImageSelection | null) => void;
  onError: (message: string | undefined) => void;
  onView?: () => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ignores a slow compression that finishes after the user picked again.
  const latestPick = useRef(0);
  const previewUrl = useObjectUrl(
    selection?.status === "ready" ? selection.file : null,
  );

  async function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const picked = input.files?.[0];
    // Reset so choosing the same photo again still fires a change event.
    input.value = "";
    if (!picked) return;

    const pick = ++latestPick.current;
    onError(undefined);
    onSelectionChange({ status: "processing" });

    try {
      const file = await compressImage(picked);
      if (pick !== latestPick.current) return;

      const message = validateUpload(file);
      if (message) {
        onSelectionChange(null);
        onError(message);
        return;
      }
      onSelectionChange({ status: "ready", file, originalSize: picked.size });
    } catch (caught) {
      if (pick !== latestPick.current) return;
      onSelectionChange(null);
      onError(
        caught instanceof ImageDecodeError
          ? caught.message
          : "This photo could not be prepared. Try another one.",
      );
    }
  }

  function clearSelection() {
    latestPick.current += 1;
    onSelectionChange(null);
    onError(undefined);
  }

  const isProcessing = selection?.status === "processing";
  const hasImage = uploaded || selection?.status === "ready";

  return (
    <div className="grid gap-3 rounded-lg border border-dashed p-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`${name}-file`}>
          {label}
          {required ? <span className="text-destructive">*</span> : null}
        </Label>
        {selection?.status === "ready" ? (
          <span className="text-xs text-primary">Ready to upload</span>
        ) : uploaded ? (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <CheckCircle2 className="size-3.5" />
            Uploaded
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not uploaded</span>
        )}
      </div>

      {isProcessing ? (
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Preparing photo...
        </div>
      ) : selection?.status === "ready" && previewUrl ? (
        <div className="flex items-center gap-3 rounded-lg bg-muted p-2">
          <img
            src={previewUrl}
            alt={`Selected ${label.toLowerCase()}`}
            className="size-16 shrink-0 rounded-lg bg-background object-cover ring-1 ring-border"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{selection.file.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatBytes(selection.file.size)}
              {selection.file.size < selection.originalSize
                ? ` · reduced from ${formatBytes(selection.originalSize)}`
                : null}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove selected ${label.toLowerCase()}`}
            onClick={clearSelection}
          >
            <X />
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {/* `capture` is ignored on desktop, where this would just duplicate
            "Choose file", so the camera button only appears on touch screens. */}
        <Button
          type="button"
          size="lg"
          className="flex-1 pointer-coarse:h-11 pointer-fine:hidden"
          disabled={isProcessing}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera />
          {hasImage ? "Retake" : "Take photo"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1 pointer-coarse:h-11 pointer-fine:flex-none"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp />
          {hasImage ? "Replace" : "Choose file"}
        </Button>
        {onView ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="basis-full pointer-coarse:h-11 pointer-fine:ml-auto pointer-fine:basis-auto"
            disabled={isAccessPending}
            onClick={onView}
          >
            <Eye />
            {isAccessPending ? "Opening..." : "View uploaded"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : uploaded && selection?.status !== "ready" ? (
        <p className="text-xs text-muted-foreground">
          The current image stays until a replacement is verified.
        </p>
      ) : null}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handlePick}
      />
      {/* A broad `accept` makes Android offer Files and Drive alongside the
          gallery; an exact MIME list limits it to the photo picker. */}
      <input
        ref={fileInputRef}
        id={`${name}-file`}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-invalid={Boolean(error)}
        onChange={handlePick}
      />
    </div>
  );
}

function validateUpload(file: File): string | null {
  if (!UPLOADABLE_IMAGE_TYPES.has(file.type)) {
    return "Use a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Image must be 8 MB or smaller.";
  }
  return null;
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
