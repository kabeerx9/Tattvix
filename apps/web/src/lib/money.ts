const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseMoneyMinor(value: string): number | null {
  const input = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) return null;
  const [whole = "0", fraction = ""] = input.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 100_000_000
    ? amount
    : null;
}

export function formatMoneyMinor(amount: number): string {
  const fraction = String(amount % 100).padStart(2, "0");
  return rupees
    .formatToParts(Math.floor(amount / 100))
    .map((part) => (part.type === "fraction" ? fraction : part.value))
    .join("");
}
