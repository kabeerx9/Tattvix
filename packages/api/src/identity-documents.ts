import { queryOptions } from "@tanstack/react-query";
import {
  identityDocumentImageAccessResponseSchema,
  identityDocumentListResponseSchema,
  identityDocumentSchema,
  identityDocumentUploadResponseSchema,
  type ApiClient,
  type IdentityDocumentImageSide,
  type IdentityDocumentInput,
} from "@tattvix/contracts";

export const identityDocumentKeys = {
  all: ["identity-documents"] as const,
  scope: (companionId?: number) =>
    companionId !== undefined
      ? ([...identityDocumentKeys.all, "companion", companionId] as const)
      : ([...identityDocumentKeys.all, "primary-guest"] as const),
  list: (companionId?: number) => [...identityDocumentKeys.scope(companionId), "list"] as const,
  detail: (id: number, companionId?: number) =>
    [...identityDocumentKeys.scope(companionId), "detail", id] as const,
};

// Browser-only raw PUT of the image bytes lives in apps/web; native uploads differently.
export function createIdentityDocumentsApi(client: ApiClient, companionId?: number) {
  const collectionPath = companionId !== undefined
    ? `/api/guest/companions/${companionId}/identity-documents/`
    : "/api/guest/identity-documents/";
  const documentPath = (id: number) => `${collectionPath}${id}/`;

  return {
    list() {
      return client.requestJson(collectionPath, identityDocumentListResponseSchema);
    },
    get(id: number) {
      return client.requestJson(documentPath(id), identityDocumentSchema);
    },
    create(input: IdentityDocumentInput) {
      return client.requestJson(collectionPath, identityDocumentSchema, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    update(id: number, input: IdentityDocumentInput) {
      return client.requestJson(documentPath(id), identityDocumentSchema, {
        method: "PUT",
        body: JSON.stringify(input),
      });
    },
    remove(id: number) {
      return client.requestVoid(documentPath(id), { method: "DELETE" });
    },
    requestUpload(id: number, side: IdentityDocumentImageSide, file: { type: string; size: number }) {
      return client.requestJson(`${documentPath(id)}uploads/`, identityDocumentUploadResponseSchema, {
        method: "POST",
        body: JSON.stringify({
          side,
          contentType: file.type,
          contentLength: file.size,
        }),
      });
    },
    completeUpload(id: number, side: IdentityDocumentImageSide, objectKey: string) {
      return client.requestJson(`${documentPath(id)}uploads/complete/`, identityDocumentSchema, {
        method: "POST",
        body: JSON.stringify({ side, objectKey }),
      });
    },
    getImageAccess(id: number, side: IdentityDocumentImageSide) {
      return client.requestJson(`${documentPath(id)}images/access/`, identityDocumentImageAccessResponseSchema, {
        method: "POST",
        body: JSON.stringify({ side }),
      });
    },
  };
}
export type IdentityDocumentsApi = ReturnType<typeof createIdentityDocumentsApi>;

export function createIdentityDocumentQueries(createApi: (companionId?: number) => IdentityDocumentsApi) {
  return {
    list: (companionId?: number) => {
      const api = createApi(companionId);

      return queryOptions({
        queryKey: identityDocumentKeys.list(companionId),
        queryFn: api.list,
        staleTime: 60_000,
      });
    },
  };
}
