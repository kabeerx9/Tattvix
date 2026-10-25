// Identity document hooks for the native app. Mirrors
// apps/web/src/features/identity-documents (use-saved-photo, use-document-save, mutations).
// Identity images are never cached on device: the screens that show them use expo-image cachePolicy "none".
import { guestProfileKeys, identityDocumentKeys, validateUploadFile } from "@tattvix/api";
import type { IdentityDocument, IdentityDocumentImageSide, IdentityDocumentInput, IdentityDocumentListResponse } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { File } from "expo-file-system";

import { api } from "./api";
import { encodeJpeg, putSignedUpload } from "./photo-upload";

/** Long edge for document photos keeps small print legible; same as the web's compress-image. */
export const DOCUMENT_PHOTO_MAX_EDGE = 2000;
export const DOCUMENT_PHOTO_QUALITY = 0.85;

export type SavedPhoto = {
  isUploaded: boolean;
  /** Short-lived signed URL; null until requested or when the request failed. */
  url: string | null;
  isLoading: boolean;
};

/** A photo the person just picked, not yet uploaded. */
export type PickedPhoto = { uri: string; width: number; height: number };

export type DocumentSaveInput = {
  documentId?: number;
  input: IdentityDocumentInput;
  /** Only sides with a newly picked photo are uploaded; saved photos are left as they are. */
  photos: Partial<Record<IdentityDocumentImageSide, PickedPhoto>>;
};

/**
 * Details saved but a photo failed: the draft exists on the server. The editor
 * keeps the draft id so a retry updates it instead of creating a duplicate.
 */
export class IdentityDocumentSaveError extends Error {
  readonly document: IdentityDocument;

  constructor(document: IdentityDocument, message: string) {
    super(message);
    this.name = "IdentityDocumentSaveError";
    this.document = document;
  }
}

/** Loads a signed URL for one saved photo while a screen that shows it is open. Keyed on updatedAt. */
export function useSavedPhoto(document: IdentityDocument | null, side: IdentityDocumentImageSide, companionId?: number): SavedPhoto {
  const isUploaded = Boolean(document && (side === "FRONT" ? document.images.front : document.images.back).isUploaded);
  const query = useQuery({
    queryKey: [...identityDocumentKeys.detail(document?.id ?? 0, companionId), "image", side, document?.updatedAt ?? ""],
    queryFn: () => api.identityDocuments(companionId).getImageAccess(document!.id, side),
    enabled: isUploaded,
    retry: false,
    refetchOnWindowFocus: false,
    // Refresh shortly before the signed URL expires.
    staleTime: (query) => Math.max(0, ((query.state.data?.expiresInSeconds ?? 0) - 30) * 1000),
    gcTime: 60_000,
  });

  return {
    isUploaded,
    url: query.data?.url ?? null,
    isLoading: isUploaded && query.isPending,
  };
}

function invalidateDocuments(client: QueryClient, companionId?: number) {
  void client.invalidateQueries({ queryKey: identityDocumentKeys.list(companionId) });
  if (companionId === undefined) void client.invalidateQueries({ queryKey: guestProfileKeys.detail() });
}

async function uploadPhoto(
  documents: ReturnType<typeof api.identityDocuments>,
  documentId: number,
  side: IdentityDocumentImageSide,
  photo: PickedPhoto,
) {
  const jpeg = await encodeJpeg(photo.uri, photo.width, photo.height, DOCUMENT_PHOTO_MAX_EDGE, DOCUMENT_PHOTO_QUALITY);
  const file = { type: "image/jpeg", size: new File(jpeg).size };
  const problem = validateUploadFile(file);
  if (problem) throw new Error(problem);

  const { objectKey, url, headers } = await documents.requestUpload(documentId, side, file);
  await putSignedUpload(url, headers, jpeg);
  await documents.completeUpload(documentId, side, objectKey);
}

/** Creates or updates the details, then uploads each newly picked photo. Resolves to the saved document. */
export function useSaveDocument(companionId?: number) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, input, photos }: DocumentSaveInput) => {
      const documents = api.identityDocuments(companionId);
      const document = documentId ? await documents.update(documentId, input) : await documents.create(input);

      const entries = Object.entries(photos) as [IdentityDocumentImageSide, PickedPhoto][];
      if (!entries.length) return document;

      try {
        await Promise.all(entries.map(([side, photo]) => uploadPhoto(documents, document.id, side, photo)));
      } catch (error) {
        let current = document;
        try {
          current = await documents.get(document.id);
        } catch {
          // Keep the saved details even if the recovery read fails.
        }
        const message = error instanceof Error ? error.message : "The photo could not be saved.";
        throw new IdentityDocumentSaveError(current, message);
      }

      return documents.get(document.id);
    },
    onSettled: () => invalidateDocuments(client, companionId),
  });
}

/** Deletes a document and drops it from the cached list straight away. */
export function useRemoveDocument(companionId?: number) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.identityDocuments(companionId).remove(id),
    onSuccess: (_unused, id) => {
      client.setQueryData<IdentityDocumentListResponse>(identityDocumentKeys.list(companionId), (current) =>
        current ? { documents: current.documents.filter((document) => document.id !== id) } : current,
      );
    },
    onSettled: () => invalidateDocuments(client, companionId),
  });
}
