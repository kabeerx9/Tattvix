import type { GuestCheckInSubmitInput } from "@tattvix/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { checkInApi } from "./api";
import { checkInKeys } from "./keys";

export const checkInMutations = {
  submit: (queryClient: QueryClient) => ({
    mutationFn: ({
      token,
      input,
    }: {
      token: string;
      input: GuestCheckInSubmitInput;
    }) => checkInApi.submit(token, input),
    onSuccess: (_stay: unknown, variables: { token: string }) =>
      queryClient.invalidateQueries({
        queryKey: checkInKeys.context(variables.token),
      }),
  }),
  revoke: (queryClient: QueryClient) => ({
    mutationFn: ({ stayId }: { token?: string; stayId: string }) =>
      checkInApi.revoke(stayId),
    onSuccess: (_stay: unknown, variables: { token?: string }) =>
      Promise.all([
        ...(variables.token
          ? [
              queryClient.invalidateQueries({
                queryKey: checkInKeys.context(variables.token),
              }),
            ]
          : []),
        queryClient.invalidateQueries({
          queryKey: checkInKeys.shares(),
        }),
      ]),
  }),
};
