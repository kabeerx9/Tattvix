import type {
  HotelRoomCreateInput,
  HotelRoomRateInput,
  HotelRoomStatusInput,
} from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { invalidateOperations } from "./invalidation";

import { hotelOperationsApi } from "./api";

type PropertyScope = {
  organizationSlug: string;
  propertySlug: string;
};

type StayScope = PropertyScope & {
  stayId: string;
};

export const hotelOperationsMutations = {
  createRoom: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      input,
    }: PropertyScope & { input: HotelRoomCreateInput }) =>
      hotelOperationsApi.createRoom(organizationSlug, propertySlug, input),
    onSuccess: (_room: unknown, variables: PropertyScope) =>
      invalidateOperations(queryClient, variables),
  }),
  updateRoomStatus: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      roomId,
      input,
    }: PropertyScope & {
      roomId: number;
      input: HotelRoomStatusInput;
    }) =>
      hotelOperationsApi.updateRoomStatus(
        organizationSlug,
        propertySlug,
        roomId,
        input,
      ),
    onSuccess: (_room: unknown, variables: PropertyScope) =>
      invalidateOperations(queryClient, variables),
  }),
  updateRoomRate: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      roomId,
      input,
    }: PropertyScope & {
      roomId: number;
      input: HotelRoomRateInput;
    }) =>
      hotelOperationsApi.updateRoomRate(
        organizationSlug,
        propertySlug,
        roomId,
        input,
      ),
    onSuccess: (_room: unknown, variables: PropertyScope) =>
      invalidateOperations(queryClient, variables),
  }),
  checkIn: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      stayId,
      roomId,
      nights,
    }: StayScope & { roomId: number; nights: number }) =>
      hotelOperationsApi.checkIn(organizationSlug, propertySlug, stayId, {
        roomId,
        nights,
      }),
    onSuccess: (_stay: unknown, variables: StayScope) =>
      invalidateOperations(queryClient, variables, variables.stayId),
  }),
  checkout: (queryClient: QueryClient) => ({
    mutationFn: ({ organizationSlug, propertySlug, stayId }: StayScope) =>
      hotelOperationsApi.checkout(organizationSlug, propertySlug, stayId),
    onSuccess: (_stay: unknown, variables: StayScope) =>
      invalidateOperations(queryClient, variables, variables.stayId),
  }),
};
