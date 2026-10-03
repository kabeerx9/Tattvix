import {
  identityDocumentImageAccessResponseSchema,
  identityDocumentListResponseSchema,
  identityDocumentSchema,
  identityDocumentUploadResponseSchema,
  type IdentityDocumentImageSide,
  type IdentityDocumentInput,
} from "@tattvix/contracts";

import { ApiError, apiClient } from "@/lib/api";

export function createIdentityDocumentsApi(companionId?: number) {
  const collectionPath = companionId !== undefined
    ? `/api/guest/companions/${companionId}/identity-documents/`
    : "/api/guest/identity-documents/";
  const documentPath = (id: number) => `${collectionPath}${id}/`;

  const api = {
    list() {
      return apiClient.requestJson(
        collectionPath,
        identityDocumentListResponseSchema,
      );
    },
    get(id: number) {
      return apiClient.requestJson(documentPath(id), identityDocumentSchema);
    },
    create(input: IdentityDocumentInput) {
      return apiClient.requestJson(collectionPath, identityDocumentSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    update(id: number, input: IdentityDocumentInput) {
      return apiClient.requestJson(documentPath(id), identityDocumentSchema, {
        method: "PUT",
        body: JSON.stringify(input),
      });
    },
    remove(id: number) {
      return apiClient.requestVoid(documentPath(id), {
        method: "DELETE",
      });
    },
    requestUpload(id: number, side: IdentityDocumentImageSide, file: File) {
      return apiClient.requestJson(
        `${documentPath(id)}uploads/`,
        identityDocumentUploadResponseSchema,
        {
          method: "POST",
          body: JSON.stringify({
            side,
            contentType: file.type,
            contentLength: file.size,
          }),
        },
      );
    },
    completeUpload(
      id: number,
      side: IdentityDocumentImageSide,
      objectKey: string,
    ) {
      return apiClient.requestJson(
        `${documentPath(id)}uploads/complete/`,
        identityDocumentSchema,
        {
          method: "POST",
          body: JSON.stringify({ side, objectKey }),
        },
      );
    },
    getImageAccess(id: number, side: IdentityDocumentImageSide) {
      return apiClient.requestJson(
        `${documentPath(id)}images/access/`,
        identityDocumentImageAccessResponseSchema,
        { method: "POST", body: JSON.stringify({ side }) },
      );
    },
    async uploadImage(
      id: number,
      side: IdentityDocumentImageSide,
      file: File,
    ) {
      const authorization = await api.requestUpload(id, side, file);
      const headers = new Headers(authorization.headers);

      // Browsers set Content-Length from the File body and do not allow JavaScript
      // to set that forbidden header directly.
      headers.delete("Content-Length");

      const response = await fetch(authorization.url, {
        method: authorization.method,
        headers,
        body: file,
      });

      if (!response.ok) {
        throw new ApiError(
          response.status,
          "The private document image could not be uploaded.",
        );
      }

      return api.completeUpload(id, side, authorization.objectKey);
    },
  };

  return api;
}

export const identityDocumentsApi = createIdentityDocumentsApi();
