export function getInitials(name: string): string {
  // Only words that start with a letter count, so emoji and symbols never
  // become half a surrogate pair. Takes the first code point, not code unit.
  const letters = name
    .trim()
    .split(/\s+/)
    .map((word) => Array.from(word)[0] ?? "")
    .filter((first) => /\p{L}/u.test(first));
  if (letters.length === 0) return "?";
  return letters
    .slice(0, 2)
    .map((letter) => letter.toUpperCase())
    .join("");
}
