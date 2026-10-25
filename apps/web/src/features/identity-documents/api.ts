import {
  createIdentityDocumentsApi as createSharedIdentityDocumentsApi,
  type IdentityDocumentsApi,
} from "@tattvix/api";
import type { IdentityDocumentImageSide } from "@tattvix/contracts";

import { ApiError, apiClient } from "@/lib/api";

// JSON endpoints come from the shared package; only the browser File PUT lives here.
export function createIdentityDocumentsApi(companionId?: number) {
  const api: IdentityDocumentsApi = createSharedIdentityDocumentsApi(apiClient, companionId);

  return {
    ...api,
    async uploadImage(id: number, side: IdentityDocumentImageSide, file: File) {
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
        throw new ApiError(response.status, "The private document image could not be uploaded.");
      }

      return api.completeUpload(id, side, authorization.objectKey);
    },
  };
}

export const identityDocumentsApi = createIdentityDocumentsApi();
