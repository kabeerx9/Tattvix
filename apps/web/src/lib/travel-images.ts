// Decorative travel photography for guest-facing pages (see public/images/travel/CREDITS.md).
// Never used to represent a hotel's own rooms or property.
const base = "/images/travel";

export const travelImages = {
  home: `${base}/jaipur-hawa-mahal.webp`,
  stays: `${base}/airport-lounge.webp`,
  profile: `${base}/map-and-kit.webp`,
  companions: `${base}/road-trip.webp`,
  privacy: `${base}/calm-lake.webp`,
  hotelOwner: `${base}/hotel-facade.webp`,
  journey: `${base}/taj-mahal.webp`,
} as const;
