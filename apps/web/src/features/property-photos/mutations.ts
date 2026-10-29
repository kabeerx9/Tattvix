import { runUploadStep } from "@tattvix/api";
import type { PropertyPhotoSlot } from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";
import { compressImage } from "@/features/identity-documents/compress-image";
import { putSignedUpload } from "@/lib/storage-upload";
import { propertyPhotosApi } from "./api";
import { propertyPhotosKeys } from "./keys";

/** `onProgress` gets the whole job's share done, 0 to 1: the bytes in flight carry most of it. */
export async function uploadPropertyPhoto(org: string, prop: string, slot: PropertyPhotoSlot, file: File, onProgress?: (share: number) => void) {
  // Sign the compressed bytes: their size and MIME type must match at finalize.
  const image = await runUploadStep("prepare", () => compressImage(file, 1600));
  const { upload } = await runUploadStep("authorize", () =>
    propertyPhotosApi.requestUpload(org, prop, { ...slot, contentType: image.type, contentLength: image.size }),
  );
  onProgress?.(0.05);
  await putSignedUpload(upload, image, (sent) => onProgress?.(0.05 + sent * 0.9));
  const saved = await runUploadStep("confirm", () => propertyPhotosApi.complete(org, prop, slot));
  onProgress?.(1);
  return saved;
}

export const propertyPhotoMutations = {
  remove: (client: QueryClient, org: string, prop: string) => ({
    mutationFn: (slot: PropertyPhotoSlot) => propertyPhotosApi.remove(org, prop, slot),
    onSuccess: () => client.invalidateQueries({ queryKey: propertyPhotosKeys.list(org, prop) }),
  }),
};
