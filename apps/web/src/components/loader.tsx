import { Hotel } from "lucide-react";

export default function Loader() {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/95 backdrop-blur-sm"
      role="status"
      aria-label="Loading Tattvix"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="tattvix-loader-mark grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Hotel className="size-6" strokeWidth={1.8} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold tracking-[-0.02em]">Tattvix</p>
          <p className="mt-1 text-xs text-muted-foreground">Preparing your workspace</p>
        </div>
      </div>
    </div>
  );
}
