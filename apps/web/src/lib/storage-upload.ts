// The browser half of a signed upload: PUT the bytes to storage as the "send"
// step. Browsers set Content-Length from the body and forbid setting it, so the
// signed one is dropped. A non-2xx answer carries storage's error code from its
// XML body; a stall aborts the request. Mirrors putSignedUpload in apps/native.
import { runUploadStep } from "@tattvix/api";

import { ApiError } from "@/lib/api";

export async function putSignedUpload(upload: { url: string; method: string; headers: Record<string, string> }, body: Blob) {
  const headers = new Headers(upload.headers);
  headers.delete("Content-Length");
  const controller = new AbortController();
  await runUploadStep(
    "send",
    async () => {
      const response = await fetch(upload.url, { method: upload.method, headers, body, signal: controller.signal });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new ApiError(response.status, "", /<Code>([^<]+)<\/Code>/.exec(text)?.[1] ?? null);
      }
    },
    undefined,
    () => controller.abort(),
  );
}
