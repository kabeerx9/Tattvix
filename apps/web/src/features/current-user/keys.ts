export const currentUserKeys = {
  all: ["current-user"] as const,
  detail: (clerkUserId: string) => [...currentUserKeys.all, clerkUserId] as const,
};
