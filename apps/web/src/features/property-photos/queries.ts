import { queryOptions } from "@tanstack/react-query";
import { propertyPhotosApi } from "./api";
import { propertyPhotosKeys } from "./keys";

export const propertyPhotoQueries = {
  list: (org: string, prop: string) => queryOptions({
    queryKey: propertyPhotosKeys.list(org, prop),
    queryFn: () => propertyPhotosApi.list(org, prop),
    // Half the server's default 120-second signed URL lifetime.
    staleTime: 60_000,
    refetchInterval: 60_000,
  }),
};
