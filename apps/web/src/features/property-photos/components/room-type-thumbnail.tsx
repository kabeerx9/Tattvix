export function RoomTypeThumbnail({ url }: { url?: string }) {
  return url ? <img src={url} alt="" className="size-8 shrink-0 rounded-md object-cover" /> : null;
}
