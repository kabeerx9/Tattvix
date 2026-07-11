export const companionKeys = {
  all: ["companions"] as const,
  list: () => [...companionKeys.all, "list"] as const,
};
