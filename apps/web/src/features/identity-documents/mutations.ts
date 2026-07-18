import type {
  IdentityDocument,
  IdentityDocumentImageSide,
  IdentityDocumentInput,
  IdentityDocumentListResponse,
} from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { guestProfileKeys } from "@/features/guest-profile/keys";

import { identityDocumentsApi } from "./api";
import { identityDocumentKeys } from "./keys";

export type IdentityDocumentSaveInput = {
  documentId?: number;
  input: IdentityDocumentInput;
  files: Partial<Record<IdentityDocumentImageSide, File>>;
};

export class IdentityDocumentSaveError extends Error {
  document: IdentityDocument;
  originalError: unknown;

  constructor(document: IdentityDocument, originalError: unknown) {
    super(
      originalError instanceof Error
        ? originalError.message
        : "The identity document could not be saved.",
    );
    this.name = "IdentityDocumentSaveError";
    this.document = document;
    this.originalError = originalError;
  }
}

function updateCachedDocuments(
  queryClient: QueryClient,
  update: (documents: IdentityDocument[]) => IdentityDocument[],
) {
  queryClient.setQueryData<IdentityDocumentListResponse>(
    identityDocumentKeys.list(),
    (current) =>
      current ? { documents: update(current.documents) } : current,
  );
}

export const identityDocumentMutations = {
  save: (queryClient: QueryClient) => ({
    mutationFn: async ({
      documentId,
      input,
      files,
    }: IdentityDocumentSaveInput) => {
      const document = documentId
        ? await identityDocumentsApi.update(documentId, input)
        : await identityDocumentsApi.create(input);

      const uploads = (
        Object.entries(files) as [IdentityDocumentImageSide, File][]
      ).map(([side, file]) =>
        identityDocumentsApi.uploadImage(document.id, side, file),
      );
      try {
        await Promise.all(uploads);
      } catch (error) {
        let currentDocument = document;
        try {
          currentDocument = await identityDocumentsApi.get(document.id);
        } catch {
          // Preserve the successfully saved metadata if the recovery read also fails.
        }
        throw new IdentityDocumentSaveError(currentDocument, error);
      }

      return uploads.length
        ? identityDocumentsApi.get(document.id)
        : document;
    },
    onSuccess: (document: IdentityDocument) => {
      updateCachedDocuments(queryClient, (documents) => {
        const exists = documents.some((item) => item.id === document.id);
        return exists
          ? documents.map((item) =>
              item.id === document.id ? document : item,
            )
          : [document, ...documents];
      });
      void queryClient.invalidateQueries({
        queryKey: guestProfileKeys.detail(),
      });
    },
    onError: (error: unknown) => {
      if (!(error instanceof IdentityDocumentSaveError)) return;
      updateCachedDocuments(queryClient, (documents) => {
        const exists = documents.some(
          (item) => item.id === error.document.id,
        );
        return exists
          ? documents.map((item) =>
              item.id === error.document.id ? error.document : item,
            )
          : [error.document, ...documents];
      });
    },
  }),
  remove: (queryClient: QueryClient) => ({
    mutationFn: identityDocumentsApi.remove,
    onSuccess: (_unused: void, id: number) => {
      updateCachedDocuments(queryClient, (documents) =>
        documents.filter((item) => item.id !== id),
      );
      void queryClient.invalidateQueries({
        queryKey: guestProfileKeys.detail(),
      });
    },
  }),
};
