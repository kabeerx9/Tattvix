// A route to return to after sign-in. Set by a signed-out guest who opened a
// check-in QR, then read once by the sign-in landing in the same process.
let pendingPath: string | null = null;

export function setPendingPath(path: string | null) {
  pendingPath = path;
}

export function takePendingPath(): string | null {
  const path = pendingPath;
  pendingPath = null;
  return path;
}
