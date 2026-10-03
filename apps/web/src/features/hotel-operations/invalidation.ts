import type { QueryClient } from "@tanstack/react-query";
import { hotelOverviewKeys } from "../hotel-overview/keys";
import { hotelStayKeys } from "../hotel-stays/keys";
import { hotelOperationsKeys } from "./keys";
type PropertyScope = { organizationSlug: string; propertySlug: string };

export function invalidateOperations(
  queryClient: QueryClient,
  variables: PropertyScope,
  stayId?: string,
) {
  const requests = [
    queryClient.invalidateQueries({
      queryKey: hotelOverviewKeys.property(variables.organizationSlug, variables.propertySlug),
    }),
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
        queryKey: hotelStayKeys.bill(
          variables.organizationSlug,
          variables.propertySlug,
          stayId,
        ),
      }),
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

export function invalidateStayBill(
  queryClient: QueryClient,
  variables: PropertyScope & { stayId: string },
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: hotelStayKeys.bill(variables.organizationSlug, variables.propertySlug, variables.stayId),
    }),
    queryClient.invalidateQueries({
      queryKey: hotelOverviewKeys.property(variables.organizationSlug, variables.propertySlug),
    }),
  ]);
}
