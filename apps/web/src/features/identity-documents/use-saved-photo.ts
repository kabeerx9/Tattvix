import type { IdentityDocument, IdentityDocumentImageSide } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";

import type { SavedPhoto } from "./components/document-image-field";
import { createIdentityDocumentsApi } from "./api";
import { identityDocumentKeys } from "./keys";

/**
 * Loads a short-lived private URL for one saved photo, only while a screen
 * that shows it is open. The list never fetches photos: a URL is requested
 * when the guest opens a document. Keyed on `updatedAt` so a replaced photo
 * gets a fresh URL; it goes stale shortly before the signed URL expires.
 */
export function useSavedPhoto(
  document: IdentityDocument | null,
  side: IdentityDocumentImageSide,
  companionId?: number,
): SavedPhoto {
  const isUploaded = Boolean(
    document && (side === "FRONT" ? document.images.front : document.images.back).isUploaded,
  );
  const query = useQuery({
    queryKey: [
      ...identityDocumentKeys.detail(document?.id ?? 0, companionId),
      "image",
      side,
      document?.updatedAt ?? "",
    ],
    queryFn: () =>
      createIdentityDocumentsApi(companionId).getImageAccess(document!.id, side),
    enabled: isUploaded,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: (query) =>
      Math.max(0, ((query.state.data?.expiresInSeconds ?? 0) - 30) * 1000),
    gcTime: 60_000,
  });

  return {
    isUploaded,
    url: query.data?.url ?? null,
    isLoading: isUploaded && query.isPending,
  };
}
