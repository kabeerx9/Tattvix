// Decorative travel photography for guest screens, bundled so it works offline
// and ships over the air. The same set as apps/web/src/lib/travel-images.ts
// (credits: apps/web/public/images/travel/CREDITS.md). Never used to represent
// a hotel's own rooms or property.
export const travelImages = {
  home: require("@/assets/images/travel/jaipur-hawa-mahal.webp"),
  stays: require("@/assets/images/travel/airport-lounge.webp"),
  profile: require("@/assets/images/travel/map-and-kit.webp"),
  companions: require("@/assets/images/travel/road-trip.webp"),
  privacy: require("@/assets/images/travel/calm-lake.webp"),
  hotelOwner: require("@/assets/images/travel/hotel-facade.webp"),
  journey: require("@/assets/images/travel/taj-mahal.webp"),
} as const;
