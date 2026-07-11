import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/core/query/query-client";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
