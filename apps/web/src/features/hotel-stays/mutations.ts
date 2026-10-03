import type { QueryClient } from "@tanstack/react-query";
import type {
  StayBillChargeInput,
  StayBillVoidInput,
} from "@tattvix/contracts";

import { invalidateStayBill } from "../hotel-operations/invalidation";

import { hotelStaysApi } from "./api";
import { hotelStayKeys } from "./keys";

type StayScope = {
  organizationSlug: string;
  propertySlug: string;
  stayId: string;
};

export const hotelStayMutations = {
  generateQr: () => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
    }: Omit<StayScope, "stayId">) =>
      hotelStaysApi.generateQr(organizationSlug, propertySlug),
  }),
  close: (queryClient: QueryClient) => ({
    mutationFn: ({ organizationSlug, propertySlug, stayId }: StayScope) =>
      hotelStaysApi.close(organizationSlug, propertySlug, stayId),
    onSuccess: (_stay: unknown, variables: StayScope) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: hotelStayKeys.list(
            variables.organizationSlug,
            variables.propertySlug,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: hotelStayKeys.detail(
            variables.organizationSlug,
            variables.propertySlug,
            variables.stayId,
          ),
        }),
      ]),
  }),
  addBillCharge: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      stayId,
      input,
    }: StayScope & { input: StayBillChargeInput }) =>
      hotelStaysApi.addBillCharge(
        organizationSlug,
        propertySlug,
        stayId,
        input,
      ),
    onSuccess: (_bill: unknown, variables: StayScope) =>
      invalidateStayBill(queryClient, variables),
  }),
  voidBillItem: (queryClient: QueryClient) => ({
    mutationFn: ({
      organizationSlug,
      propertySlug,
      stayId,
      itemId,
      input,
    }: StayScope & { itemId: string; input: StayBillVoidInput }) =>
      hotelStaysApi.voidBillItem(
        organizationSlug,
        propertySlug,
        stayId,
        itemId,
        input,
      ),
    onSuccess: (_bill: unknown, variables: StayScope) =>
      invalidateStayBill(queryClient, variables),
  }),
};
