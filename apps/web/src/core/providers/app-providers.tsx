import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";

export function AppProviders({
  children,
  client,
}: {
  children: React.ReactNode;
  client: QueryClient;
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
