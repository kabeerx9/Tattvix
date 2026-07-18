export const checkInKeys = {
  all: ["check-in"] as const,
  context: (token: string) => [...checkInKeys.all, "context", token] as const,
  shares: () => [...checkInKeys.all, "shares"] as const,
};
