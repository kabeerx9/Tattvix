export const platformOversightKeys = {
  all: ["platform-oversight"] as const,
  stays: () => [...platformOversightKeys.all, "stays"] as const,
  audit: (organizationSlug: string, action: string, limit: number) =>
    [
      ...platformOversightKeys.all,
      "audit",
      organizationSlug,
      action,
      limit,
    ] as const,
  weeklyCheckIns: (weeks: number) =>
    [...platformOversightKeys.all, "weekly-check-ins", weeks] as const,
};
