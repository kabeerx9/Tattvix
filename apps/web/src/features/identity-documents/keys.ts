export const identityDocumentKeys = {
  all: ["identity-documents"] as const,
  list: () => [...identityDocumentKeys.all, "list"] as const,
  detail: (id: number) => [...identityDocumentKeys.all, "detail", id] as const,
};
