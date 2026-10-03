// Shown by the router when a navigation's loaders run past `pendingMs`.
// A thin top bar instead of a full-screen takeover: the page you're on stays
// visible while the next one loads.
export function RoutePendingBar() {
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent"
    >
      <div className="h-full w-1/3 animate-[route-pending_1.2s_ease-in-out_infinite] rounded-full bg-primary motion-reduce:w-full motion-reduce:animate-none" />
    </div>
  );
}
