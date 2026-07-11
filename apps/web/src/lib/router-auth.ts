import type { MeResponse } from "@tattvix/contracts";

export type RouterAuthContext = {
  isAuthenticated: boolean;
  currentUser: MeResponse | null;
};
