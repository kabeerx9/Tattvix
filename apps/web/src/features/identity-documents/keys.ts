export const identityDocumentKeys = {
  all: ["identity-documents"] as const,
  scope: (companionId?: number) =>
    companionId !== undefined
      ? ([...identityDocumentKeys.all, "companion", companionId] as const)
      : ([...identityDocumentKeys.all, "primary-guest"] as const),
  list: (companionId?: number) =>
    [...identityDocumentKeys.scope(companionId), "list"] as const,
  detail: (id: number, companionId?: number) =>
    [...identityDocumentKeys.scope(companionId), "detail", id] as const,
};
