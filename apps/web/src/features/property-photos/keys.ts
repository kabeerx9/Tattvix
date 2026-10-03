export const propertyPhotosKeys = {
  all: ["property-photos"] as const,
  list: (org: string, prop: string) => ["property-photos", org, prop] as const,
};
