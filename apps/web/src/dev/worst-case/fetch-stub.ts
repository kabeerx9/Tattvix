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

function route(method: string, path: string) {
  const data = fixtureData;
  if (method !== "GET") {
    return json({ error: "Read-only worst-case harness: changes are not saved." }, 400);
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
    return route(request.method, url.pathname);
  }
  return realFetch(input, init);
};
