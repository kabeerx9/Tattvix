import {
  createIdentityDocumentsApi as createSharedIdentityDocumentsApi,
  runUploadStep,
  type IdentityDocumentsApi,
} from "@tattvix/api";
import type { IdentityDocumentImageSide } from "@tattvix/contracts";

import { apiClient } from "@/lib/api";
import { putSignedUpload } from "@/lib/storage-upload";

// JSON endpoints come from the shared package; only the browser File PUT lives here.
export function createIdentityDocumentsApi(companionId?: number) {
  const api: IdentityDocumentsApi = createSharedIdentityDocumentsApi(apiClient, companionId);

  return {
    ...api,
    async uploadImage(id: number, side: IdentityDocumentImageSide, file: File) {
      // Each step names itself on failure or after a stall; see runUploadStep.
      const authorization = await runUploadStep("authorize", () => api.requestUpload(id, side, file));
      await putSignedUpload(authorization, file);
      return runUploadStep("confirm", () => api.completeUpload(id, side, authorization.objectKey));
    },
  };
}

export const identityDocumentsApi = createIdentityDocumentsApi();
