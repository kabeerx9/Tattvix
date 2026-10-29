// The browser half of a signed upload: PUT the bytes to storage as the "send"
// step. It uses XMLHttpRequest because fetch cannot report upload progress;
// `onProgress` gets the share of bytes sent, 0 to 1. Browsers set Content-Length
// from the body and forbid setting it, so the signed one is dropped. A non-2xx
// answer carries storage's error code from its XML body; a stall aborts the
// request. Mirrors putSignedUpload in apps/native.
import { runUploadStep } from "@tattvix/api";

import { ApiError } from "@/lib/api";

export async function putSignedUpload(
  upload: { url: string; method: string; headers: Record<string, string> },
  body: Blob,
  onProgress?: (sent: number) => void,
) {
  const request = new XMLHttpRequest();
  await runUploadStep(
    "send",
    () =>
      new Promise<void>((resolve, reject) => {
        request.open(upload.method, upload.url);
        for (const [name, value] of Object.entries(upload.headers)) {
          if (name.toLowerCase() !== "content-length") request.setRequestHeader(name, value);
        }
        request.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
        };
        request.onload = () => {
          if (request.status >= 200 && request.status < 300) return resolve();
          reject(new ApiError(request.status, "", /<Code>([^<]+)<\/Code>/.exec(request.responseText)?.[1] ?? null));
        };
        // A network failure or a CORS refusal: no status reaches the page.
        request.onerror = () => reject(new TypeError("Failed to fetch"));
        request.onabort = () => reject(new DOMException("The upload was cancelled.", "AbortError"));
        request.send(body);
      }),
    undefined,
    () => request.abort(),
  );
}
