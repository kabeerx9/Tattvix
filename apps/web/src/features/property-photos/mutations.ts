import type { PropertyPhotoSlot } from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";
import { compressImage } from "@/features/identity-documents/compress-image";
import { ApiError } from "@/lib/api";
import { propertyPhotosApi } from "./api";
import { propertyPhotosKeys } from "./keys";

export async function uploadPropertyPhoto(org: string, prop: string, slot: PropertyPhotoSlot, file: File) {
  // Sign the compressed bytes: their size and MIME type must match at finalize.
  const image = await compressImage(file, 1600);
  const { upload } = await propertyPhotosApi.requestUpload(org, prop, {
    ...slot, contentType: image.type, contentLength: image.size,
  });
  const headers = new Headers(upload.headers);
  headers.delete("Content-Length");
  const response = await fetch(upload.url, { method: upload.method, headers, body: image });
  if (!response.ok) throw new ApiError(response.status, "The photo could not be uploaded.");
  return propertyPhotosApi.complete(org, prop, slot);
}

export const propertyPhotoMutations = {
  upload: (client: QueryClient, org: string, prop: string) => ({
    mutationFn: ({ slot, file }: { slot: PropertyPhotoSlot; file: File }) => uploadPropertyPhoto(org, prop, slot, file),
    onSuccess: () => client.invalidateQueries({ queryKey: propertyPhotosKeys.list(org, prop) }),
  }),
  remove: (client: QueryClient, org: string, prop: string) => ({
    mutationFn: (slot: PropertyPhotoSlot) => propertyPhotosApi.remove(org, prop, slot),
    onSuccess: () => client.invalidateQueries({ queryKey: propertyPhotosKeys.list(org, prop) }),
  }),
};
