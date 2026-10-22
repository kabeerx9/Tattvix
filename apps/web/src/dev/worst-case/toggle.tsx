import { activeDataset } from "./fetch-stub";
import { datasets, type Dataset } from "./fixtures";

const labels: Record<Dataset, string> = {
  demo: "Demo data",
  worst: "Worst case",
  empty: "Empty",
  one: "One",
  access: "Access states",
};

/**
 * Harness chrome, deliberately plain and outside the design system: a grey
 * track with a white pill on the active segment. Switching reloads so every
 * query refetches through the stubbed API with the new dataset.
 */
export function DatasetToggle() {
  function select(dataset: Dataset) {
    const url = new URL(window.location.href);
    url.searchParams.set("data", dataset);
    window.location.assign(url);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Fixture dataset"
      style={{
        position: "fixed",
        bottom: 56,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "#e5e7eb",
        font: "12px system-ui, sans-serif",
        boxShadow: "0 1px 3px rgb(0 0 0 / 0.15)",
      }}
    >
      {datasets.map((dataset) => (
        <button
          key={dataset}
          type="button"
          role="radio"
          aria-checked={dataset === activeDataset}
          onClick={() => select(dataset)}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "4px 10px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            color: "#111827",
            background: dataset === activeDataset ? "#ffffff" : "transparent",
          }}
        >
          {labels[dataset]}
        </button>
      ))}
    </div>
  );
}
