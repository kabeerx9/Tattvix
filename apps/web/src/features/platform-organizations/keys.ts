export const platformOrganizationKeys = {
  all: ["platform-organizations"] as const,
  list: () => [...platformOrganizationKeys.all, "list"] as const,
  detail: (organizationSlug: string) =>
    [...platformOrganizationKeys.all, "detail", organizationSlug] as const,
};
