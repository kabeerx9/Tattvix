export const platformUserKeys = {
  all: ["platform-users"] as const,
  search: (email: string) => [...platformUserKeys.all, "search", email] as const,
};
