/**
 * Dev-only: replaces window.fetch for API calls with fixture responses.
 * Imported first by the harness entry so `createApiClient` captures this
 * stub, not the real fetch. Never imported by the production entry.
 */
import { env } from "@tattvix/env/web";

import {
  companionDocuments,
  datasets,
  getDataset,
  type Dataset,
} from "./fixtures";

const param = new URLSearchParams(window.location.search).get("data");
export const activeDataset: Dataset = datasets.includes(param as Dataset)
  ? (param as Dataset)
  : "worst";
export const fixtureData = getDataset(activeDataset);

const realFetch = window.fetch.bind(window);

function json(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

/**
 * A drawn stand-in for a private document photo, so the viewer and editor
 * show real image states. Clearly marked as a sample; no real ID data.
 */
function samplePhotoUrl(side: string, id: number) {
  const back = side === "BACK";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="856" height="540" viewBox="0 0 856 540">
<rect width="856" height="540" rx="28" fill="#eef3f3"/>
<rect x="0" y="0" width="856" height="86" rx="28" fill="#1f5f5b"/>
<rect x="0" y="58" width="856" height="28" fill="#1f5f5b"/>
<text x="40" y="56" font-family="sans-serif" font-size="30" fill="#fff">SAMPLE ID · ${back ? "BACK" : "FRONT"}</text>
${back
  ? `<rect x="40" y="130" width="776" height="22" rx="6" fill="#c9d6d5"/><rect x="40" y="172" width="640" height="22" rx="6" fill="#c9d6d5"/><rect x="40" y="214" width="700" height="22" rx="6" fill="#c9d6d5"/><rect x="616" y="330" width="200" height="170" fill="#1d2939"/>`
  : `<rect x="40" y="130" width="200" height="250" rx="14" fill="#c9d6d5"/><circle cx="140" cy="215" r="48" fill="#98aeac"/><rect x="280" y="140" width="420" height="26" rx="6" fill="#98aeac"/><rect x="280" y="196" width="320" height="22" rx="6" fill="#c9d6d5"/><rect x="280" y="244" width="360" height="22" rx="6" fill="#c9d6d5"/>`}
<text x="40" y="490" font-family="monospace" font-size="34" fill="#1d2939">XXXX XXXX ${String(id).padStart(4, "0")}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function delayed(response: Promise<Response>, ms: number) {
  return new Promise<Response>((resolve) => setTimeout(() => resolve(response), ms));
}

function route(method: string, path: string, body: string) {
  const data = fixtureData;
  const access = path.match(/identity-documents\/(\d+)\/images\/access\/$/);
  if (method === "POST" && access) {
    const side = (JSON.parse(body || "{}") as { side?: string }).side ?? "FRONT";
    return delayed(json({ url: samplePhotoUrl(side, Number(access[1])), expiresInSeconds: 300 }), 350);
  }
  if (method !== "GET") {
    // Delayed so the save/upload progress state is visible before the error.
    return delayed(
      json({ error: "Read-only worst-case harness: changes are not saved." }, 400),
      1200,
    );
  }
  if (path === "/api/me/") return json(data.me);
  if (path === "/api/guest/profile/") return json(data.profile);
  if (path === "/api/guest/identity-documents/")
    return json({ documents: data.documents });
  if (path === "/api/guest/companions/")
    return json({ companions: data.companions });
  if (path === "/api/guest/stays/") return json({ stays: data.shares });

  let match = path.match(/^\/api\/guest\/companions\/(\d+)\/identity-documents\/$/);
  if (match) return json({ documents: companionDocuments(data, Number(match[1])) });

  match = path.match(/^\/api\/guest\/stays\/([^/]+)\/bill\/$/);
  if (match) return json(data.bill(decodeURIComponent(match[1]!)));

  match = path.match(/^\/api\/guest\/stays\/([^/]+)\/$/);
  if (match) {
    const stay = data.shares.find((share) => share.id === decodeURIComponent(match![1]!));
    return stay ? json(stay) : json({ error: "Stay not found." }, 404);
  }

  match = path.match(/^\/api\/check-in\/([^/]+)\/$/);
  if (match) {
    const token = decodeURIComponent(match[1]!);
    return token === "expired"
      ? json({ error: "Not found." }, 404)
      : json(data.checkIn(token));
  }

  return json({ error: `No fixture for ${path}` }, 404);
}

window.fetch = (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (request.url.startsWith(env.VITE_SERVER_URL)) {
    return request.text().then((body) => route(request.method, url.pathname, body));
  }
  return realFetch(input, init);
};
