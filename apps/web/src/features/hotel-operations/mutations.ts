import type {
  HotelRoomCreateInput,
  HotelRoomStatusInput,
} from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { hotelStayKeys } from "@/features/hotel-stays/keys";

import { hotelOperationsApi } from "./api";
import { hotelOperationsKeys } from "./keys";

type PropertyScope = {
  organizationSlug: string;
  propertySlug: string;
};

type StayScope = PropertyScope & {
  stayId: string;
};

function invalidateOperations(
  queryClient: QueryClient,
  variables: PropertyScope,
  stayId?: string,
) {
  const requests = [
    queryClient.invalidateQueries({
      queryKey: hotelOperationsKeys.property(
        variables.organizationSlug,
        variables.propertySlug,
      ),
    }),
    queryClient.invalidateQueries({
      queryKey: hotelStayKeys.list(
        variables.organizationSlug,
        variables.propertySlug,
      ),
    }),
  ];
  if (stayId) {
    requests.push(
      queryClient.invalidateQueries({
        queryKey: hotelStayKeys.detail(
          variables.organizationSlug,
          variables.propertySlug,
          stayId,
        ),
      }),
    );
  }
  return Promise.all(requests);
}

export const hotelOperationsMutations = {
  createRoom: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      input,
    }: PropertyScope & { input: HotelRoomCreateInput }) =>
      hotelOperationsApi.createRoom(
        organizationSlug,
        propertySlug,
        input,
      ),
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
  checkIn: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      stayId,
      roomId,
    }: StayScope & { roomId: number }) =>
      hotelOperationsApi.checkIn(
        organizationSlug,
        propertySlug,
        stayId,
        { roomId },
      ),
    onSuccess: (_stay: unknown, variables: StayScope) =>
      invalidateOperations(queryClient, variables, variables.stayId),
  }),
  checkout: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      stayId,
    }: StayScope) =>
      hotelOperationsApi.checkout(
        organizationSlug,
        propertySlug,
        stayId,
      ),
    onSuccess: (_stay: unknown, variables: StayScope) =>
      invalidateOperations(queryClient, variables, variables.stayId),
  }),
};
