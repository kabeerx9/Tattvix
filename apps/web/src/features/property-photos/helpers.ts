import type { PropertyPhotosResponse } from "@tattvix/contracts";

export function getRoomTypePhotoUrl(photos: PropertyPhotosResponse | undefined, roomType: string | null | undefined) {
  return photos?.roomTypes.find((photo) => photo.roomType === roomType)?.url;
}
