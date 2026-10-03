import { queryOptions } from "@tanstack/react-query";
import { checkInKeys } from "@/features/check-in/keys";
import { guestStaysApi } from "./api";
export const guestStayQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: [...checkInKeys.all, "stay", id],
      queryFn: () => guestStaysApi.detail(id),
      staleTime: 5000,
    }),
  bill: (id: string) =>
    queryOptions({
      queryKey: ["guest-stay-bill", id],
      queryFn: () => guestStaysApi.bill(id),
      staleTime: 5000,
    }),
};
