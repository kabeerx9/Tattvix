// Desk mutations and the invalidation they share (mirrors the web's
// features/hotel-operations/{mutations,invalidation}.ts). Every writer
// invalidates overview, rooms, guests and the stay list for the property;
// stay-scoped writers also drop that stay's detail and bill.
import { hotelOperationsKeys, hotelOverviewKeys, hotelStayKeys } from "@tattvix/api";
import type { HotelRoomListResponse, HotelRoomStatusInput } from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { api } from "./api";

export type PropertyScope = { organizationSlug: string; propertySlug: string };
export type StayScope = PropertyScope & { stayId: string };

export function invalidateOperations(queryClient: QueryClient, scope: PropertyScope, stayId?: string) {
  const { organizationSlug, propertySlug } = scope;
  const requests = [
    queryClient.invalidateQueries({ queryKey: hotelOverviewKeys.property(organizationSlug, propertySlug) }),
    queryClient.invalidateQueries({ queryKey: hotelOperationsKeys.property(organizationSlug, propertySlug) }),
    // Every list variant (search, status filter) shares this prefix.
    queryClient.invalidateQueries({ queryKey: [...hotelStayKeys.property(organizationSlug, propertySlug), "list"] }),
  ];
  if (stayId) {
    requests.push(
      queryClient.invalidateQueries({ queryKey: hotelStayKeys.detail(organizationSlug, propertySlug, stayId) }),
      queryClient.invalidateQueries({ queryKey: hotelStayKeys.bill(organizationSlug, propertySlug, stayId) }),
    );
  }
  return Promise.all(requests);
}

export const hotelMutations = {
  checkIn: (queryClient: QueryClient) => ({
    mutationFn: ({ organizationSlug, propertySlug, stayId, roomId, nights }: StayScope & { roomId: number; nights: number }) =>
      api.hotelOperations.checkIn(organizationSlug, propertySlug, stayId, { roomId, nights }),
    onSuccess: (_stay: unknown, variables: StayScope) => invalidateOperations(queryClient, variables, variables.stayId),
  }),
  checkout: (queryClient: QueryClient) => ({
    mutationFn: ({ organizationSlug, propertySlug, stayId }: StayScope) => api.hotelOperations.checkout(organizationSlug, propertySlug, stayId),
    onSuccess: (_stay: unknown, variables: StayScope) => invalidateOperations(queryClient, variables, variables.stayId),
  }),
  // Optimistic: the room flips in the grid at once and rolls back on failure.
  // Room status is the one desk write that is both frequent and low-stakes.
  updateRoomStatus: (queryClient: QueryClient) => ({
    mutationFn: ({ organizationSlug, propertySlug, roomId, input }: PropertyScope & { roomId: number; input: HotelRoomStatusInput }) =>
      api.hotelOperations.updateRoomStatus(organizationSlug, propertySlug, roomId, input),
    onMutate: async (variables: PropertyScope & { roomId: number; input: HotelRoomStatusInput }) => {
      const key = hotelOperationsKeys.rooms(variables.organizationSlug, variables.propertySlug);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<HotelRoomListResponse>(key);
      if (previous) {
        queryClient.setQueryData<HotelRoomListResponse>(key, {
          rooms: previous.rooms.map((room) => (room.id === variables.roomId ? { ...room, status: variables.input.status } : room)),
        });
      }
      return { previous, key };
    },
    onError: (_error: unknown, _variables: unknown, context?: { previous?: HotelRoomListResponse; key: readonly unknown[] }) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_room: unknown, _error: unknown, variables: PropertyScope) => invalidateOperations(queryClient, variables),
  }),
  generateQr: () => ({
    mutationFn: ({ organizationSlug, propertySlug }: PropertyScope) => api.hotelStays.generateQr(organizationSlug, propertySlug),
  }),
};
