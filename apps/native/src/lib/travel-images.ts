// Decorative travel photos for guest Home and sign-in, bundled so it works offline and ships
// over the air. Same image as apps/web/src/lib/travel-images.ts (credits:
// apps/web/public/images/travel/CREDITS.md). Photos appear only on the two
// hubs and sign-in; never used to represent a hotel's own rooms or property.
export const travelImages = {
  home: require("@/assets/images/travel/jaipur-hawa-mahal.webp"),
  signIn: require("@/assets/images/travel/hotel-facade.webp"),
} as const;
