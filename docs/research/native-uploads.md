# Native file upload path for presigned photo and document uploads

Research date: 2026-10-25. Resolves [issue #49](https://github.com/kabeerx9/Tattvix/issues/49). Primary sources only: this repo, Expo SDK 57 docs and the `sdk-57` branch of `expo/expo`, the `0.86-stable` branch of `facebook/react-native`, botocore (run locally), and AWS/Android docs. The native app is on Expo SDK 57 / React Native 0.86 (`apps/native/package.json`), not SDK 58; everything below was checked against the SDK 57 docs and source.

## Recommendation

Use `expo-image-picker` (or `expo-document-picker` with `type: 'image/*'`) to pick, `expo-image-manipulator` to re-encode to JPEG, then `new File(uri)` from `expo-file-system` for `size`/`type` and **`file.upload(url, { httpMethod: 'PUT', uploadType: UploadType.BINARY_CONTENT, headers })`** for the presigned PUT, forwarding the server's `Content-Type` and `Cache-Control` headers verbatim and dropping `Content-Length`. Then call the existing `complete` endpoint. No server change is needed; MinIO and S3 verify the same SigV4 signed headers.

## 1. Server contract as it exists

### Storage boundary

- `apps/server/api/object_storage.py:41-52`: one boto3 S3 client, `signature_version="s3v4"`, `addressing_style="path"`, endpoint/credentials/region from settings. The class docstring (`:29`) says it is "shared by local MinIO and production R2"; the deploy doc says production is actually an S3 bucket in `ap-south-1` (`docs/deploy.md:12`, `:98-106`). Either way it is one S3-compatible SigV4 client.
- `apps/server/api/object_storage.py:54-86` `create_upload_url`: `generate_presigned_url("put_object", Params={Bucket, Key, ContentType, ContentLength, CacheControl: "private, no-store"}, ExpiresIn=ttl, HttpMethod="PUT")`. It returns `PresignedUpload(object_key, url, method="PUT", headers={"Content-Type", "Content-Length", "Cache-Control": "private, no-store"}, expires_in_seconds)`.
- `apps/server/api/object_storage.py:143-155`: content type must be in `OBJECT_STORAGE_ALLOWED_CONTENT_TYPES`, size must be `1..OBJECT_STORAGE_MAX_UPLOAD_BYTES`.
- Settings (`apps/server/tattvix/settings.py:238-268`): defaults `endpoint http://127.0.0.1:9000`, bucket `tattvix-identity-documents-dev`, region `us-east-1`, TTL 120 s (max 900, `:283-286`), max 8 MiB, allowed `image/jpeg,image/png,image/webp`. `:287-292` requires HTTPS and non-dev credentials when `DEBUG` is off.
- Dev store: `compose.yaml:18-50` runs `minio/minio:RELEASE.2025-09-07T16-13-09Z` on `127.0.0.1:9000`, creates the bucket and a scoped user; `compose.yaml:65` points the containerised server at `http://minio:9000`. `apps/server/.env.example:16-23` mirrors the defaults for a host-run server.

### What the presigned URL actually signs (verified)

Running the exact `generate_presigned_url` call from `object_storage.py` with botocore 1.43.51 (the version `uv run` resolves in `apps/server`) yields:

```
X-Amz-SignedHeaders=cache-control;content-length;content-type;host
```

So the PUT must carry `Cache-Control: private, no-store`, `Content-Length: <exact signed size>`, `Content-Type: <exact signed type>` and the signed `Host`. A client that omits `Cache-Control`, changes the type, sends a different byte count, or rewrites the host gets `403 SignatureDoesNotMatch` from any SigV4 implementation. AWS documents the content-type half of this explicitly ("Make sure the content type in your upload request matches the content type specified when generating the URL", [Uploading objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)). The web client relies on the same fact: it forwards `upload.headers` and deletes only `Content-Length`, which browsers set from the body (`apps/web/src/features/identity-documents/api.ts:86-96`, `apps/web/src/features/property-photos/mutations.ts:14-16`).

### Property photos (hotel, `HOTEL_MANAGE`)

Routes: `apps/server/api/urls.py:69-71`.

1. `POST /api/hotel/{org}/{property}/photos/upload/` (`apps/server/api/property_photo_views.py:67-86`). Body: `{kind: "COVER"|"ROOM_TYPE", roomType?, contentType, contentLength}` (`:21-33`). Response: `{"upload": {url, method: "PUT", headers, expiresInSeconds}}` (`:80-83`). Note: no `objectKey` is returned; the pending key is stored on the `PropertyPhoto` row (`apps/server/api/property_photos.py:53-61`). Errors: 400 for bad slot/type/size, 503 if storage is down. Throttle scope `identity-upload` (`:69`, `:86`).
2. Client PUTs the bytes to `upload.url`.
3. `POST .../photos/upload/complete/` (`property_photo_views.py:89-106`). Body: `{kind, roomType?}` only. Server `head_object`s the pending key and compares `ContentType`/`ContentLength` with what was signed; a mismatch deletes the object and returns 400 "The uploaded file does not match the authorized upload." (`property_photos.py:66-92`). Success returns the photo list payload with fresh download URLs (`:114-123`).

Contract schema: `packages/contracts/src/hotel-operations.ts:202-209`.

### Identity documents (guest, owner or companion)

Routes: `apps/server/api/urls.py:186-193` (own) and `:161-168` (companion).

1. `POST /api/guest/identity-documents/{id}/uploads/` (`apps/server/api/identity_document_views.py:95-130`). Body: `{side: "FRONT"|"BACK", contentType, contentLength}` validated against the allowed types and max bytes (`apps/server/api/serializers.py:262-271`). Response: `{objectKey, url, method: "PUT", headers, expiresInSeconds}` (`:119-127`). Keys look like `users/{user}/identity-documents/{doc}/{side}/{uuid}.jpg` (`apps/server/api/identity_documents.py:163-167`); the extension comes from `CONTENT_TYPE_EXTENSIONS` (`:42-46`). 503 if storage is down.
2. Client PUTs the bytes.
3. `POST .../uploads/complete/` (`identity_document_views.py:133-164`). Body: `{side, objectKey}` (`serializers.py:274-276`). The key must still be the pending key for that side, else 409 "This upload is no longer current" (`identity_documents.py:207-214`, `:224-227`); then `head_object` type/length must equal the signed values, else 409 "The uploaded file does not match the authorized upload." (`:215-216`, `:288-299`). Success returns the document payload.

Contract schema: `packages/contracts/src/identity-document.ts:66-77`. Web flow: `apps/web/src/features/identity-documents/api.ts:45-106`; the web compresses to JPEG, max edge 2000, quality 0.85 (`compress-image.ts:1-4`) and 1600 for property photos (`property-photos/mutations.ts:10`), and signs the compressed bytes ("their size and MIME type must match at finalize", `mutations.ts:9`).

Scope note: per `AGENTS.md` the native app is guest-only, so only the identity-document flow is in native scope today; the helper below works for both because the PUT leg is identical.

## 2. Recommended native call sequence

### Why `File.upload` from the new `expo-file-system` API

- It exists in the installed version: `expo-file-system@57.0.0` ships `File.upload(url, options)` and `File.createUploadTask(url, options)` (`node_modules/.pnpm/expo-file-system@57.0.0_*/node_modules/expo-file-system/build/File.d.ts:121-135`); the CHANGELOG records them as added in 56.0.0 ("Add `File.upload()` with legacy-compatible upload semantics, progress callbacks, and `AbortSignal` support", [CHANGELOG](https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo-file-system/CHANGELOG.md)). The module is only a transitive dependency today; add it (and the pickers/manipulator) with `npx expo install`.
- Docs: [`UploadOptions`](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#uploadoptions) take `httpMethod: 'POST'|'PUT'|'PATCH'` (default POST), `uploadType` (default `UploadType.BINARY_CONTENT`, "the file is uploaded as-is in the request body"), `headers`, `onProgress({bytesSent, totalBytes})`, `signal`, and iOS `sessionType` (default `'background'`). [`UploadResult`](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#uploadresult) is `{status, headers, body}` and resolves for non-2xx too ("resolves with response metadata and body for completed HTTP responses, including non-2xx status codes").
- Android ([FileSystemUploadTask.kt](https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo-file-system/android/src/main/java/expo/modules/filesystem/FileSystemUploadTask.kt)): `BINARY_CONTENT` builds `file.asRequestBody(null)` wrapped in a counting body whose `contentLength()` is the file length and whose `writeTo` streams via `sink.writeAll(source)`; no `Content-Type` is added by the module, user `headers` are applied with `addHeader`, and the method is `requestBuilder.method(options.httpMethod, body)`. Because the body length is known, OkHttp emits `Content-Length` equal to the file size, which is exactly what was signed.
- iOS ([FileSystemUploadTask.swift](https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo-file-system/ios/FileSystemUploadTask.swift)): binary uploads use `session.uploadTask(with: request, fromFile:)`, so the file streams from disk; only user headers are set; `Content-Length` is derived by URLSession from the file; progress comes from `didSendBodyData`; `sessionType` picks a background or foreground `URLSession`.
- Both platforms throttle progress to ~100 ms and emit a final event; JS also emits a synthetic final `{bytesSent: size, totalBytes: size}` ([NetworkTasks.ts](https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo-file-system/src/NetworkTasks.ts)).

### Sequence

1. Pick. `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] })` or `launchCameraAsync()`. Assets expose `uri`, `mimeType`, `fileSize`, `width`, `height` ([ImagePickerAsset](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/#imagepickerasset)). Since SDK 54 the default options "return the original asset (including HEIC and AVIF files)" on iOS, so the picked type may be one the server rejects. For a Files-app pick, `DocumentPicker.getDocumentAsync({ type: 'image/*' })` with the default `copyToCacheDirectory: true` so the file is readable immediately ([Using with expo-file-system](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/#using-with-expo-file-system)). On Android, handle `ImagePicker.getPendingResultAsync()` on mount, because the OS may kill `MainActivity` while the picker is open ([docs](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/#imagepickergetpendingresultasync)).
2. Normalise. `ImageManipulator.manipulate(uri).resize({ width: maxEdge })` (resize keeps ratio when one side is given) → `renderAsync()` → `saveAsync({ format: SaveFormat.JPEG, compress: 0.85 })` ([ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/)). This mirrors the web's `compressImage` (2000 px for documents, 1600 for property photos) and guarantees `image/jpeg`, which both stores accept. Only resize when the longer edge exceeds `maxEdge`.
3. Measure the final bytes. `const file = new File(result.uri)`; `file.size` and `file.type` are read from disk ([File properties](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#size)). Use these, not the picker's `fileSize`, because the server compares the HEAD metadata with what was signed.
4. Authorise. `POST .../uploads/` with `{side, contentType: 'image/jpeg', contentLength: file.size}` through the existing `createApiClient` (`apps/native/lib/api.ts`, `packages/contracts/src/http.ts`).
5. PUT. `file.upload(upload.url, { httpMethod: upload.method, uploadType: UploadType.BINARY_CONTENT, headers: withoutContentLength(upload.headers), onProgress, signal })`. Treat `status` outside 200–299 as failure.
6. Complete. `POST .../uploads/complete/` with `{side, objectKey}` (identity documents) or `{kind, roomType}` (property photos). Map 409 to "pick the file again" and re-run from step 4.
7. Delete the manipulator's cache copy (`file.delete()`) after completion or failure.

### Code sketch

```ts
import { File, UploadType } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ApiClient } from "@tattvix/contracts";
import { identityDocumentSchema, identityDocumentUploadResponseSchema } from "@tattvix/contracts";

const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

async function toUploadableJpeg(uri: string, width: number, height: number) {
  const context = ImageManipulator.manipulate(uri);
  const longEdge = Math.max(width, height);
  if (longEdge > MAX_EDGE) {
    context.resize(width >= height ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return new File(saved.uri); // .size and .type come from disk
}

export async function uploadIdentityImage(
  api: ApiClient,
  documentPath: string, // e.g. /api/guest/identity-documents/42/
  side: "FRONT" | "BACK",
  file: File,
  onProgress?: (sent: number, total: number) => void,
  signal?: AbortSignal,
) {
  const auth = await api.requestJson(`${documentPath}uploads/`, identityDocumentUploadResponseSchema, {
    method: "POST",
    body: JSON.stringify({ side, contentType: file.type, contentLength: file.size }),
  });

  // Content-Length is derived from the file by OkHttp/URLSession; the other
  // signed headers (Content-Type, Cache-Control) must be sent verbatim.
  const { "Content-Length": _ignored, ...headers } = auth.headers;

  const result = await file.upload(auth.url, {
    httpMethod: auth.method,
    uploadType: UploadType.BINARY_CONTENT,
    headers,
    signal,
    onProgress: ({ bytesSent, totalBytes }) => onProgress?.(bytesSent, totalBytes),
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Storage rejected the upload (${result.status})`);
  }

  return api.requestJson(`${documentPath}uploads/complete/`, identityDocumentSchema, {
    method: "POST",
    body: JSON.stringify({ side, objectKey: auth.objectKey }),
  });
}
```

### Behaviour notes

- Content type: never trust the picker's `mimeType` for the signed value; use the re-encoded file's `type`. The server only accepts `image/jpeg`, `image/png`, `image/webp` (`settings.py:263-268`) and the SigV4 `content-type` header is signed, so a HEIC original would fail twice.
- Large files: both platforms stream from disk; nothing is base64-encoded or held in JS memory. The server caps uploads at 8 MiB anyway, and the JPEG re-encode keeps a typical phone photo well under that.
- Background: iOS defaults to a background `URLSession`, so an in-flight PUT survives the app being suspended, but the docs warn the JS task "is not restored if the app is terminated or relaunched". There is no Android equivalent; the upload is a foreground OkHttp call. Given the 120 s presigned TTL and small files, do not design around resumable background uploads; on resume, just retry from step 4.
- Progress and cancel: `onProgress` and `AbortSignal` are built in; the web shows per-file stage progress (`use-document-save.ts`), and the native UI can show bytes.
- Dev networking: the `host` header is signed, so the device must reach MinIO at the same host the server signed. The default endpoint `http://127.0.0.1:9000` is the emulator's own loopback ("127.0.0.1 — The emulated device loopback interface"; use "10.0.2.2 — Special alias to your host loopback interface", [Android emulator networking](https://developer.android.com/studio/run/emulator-networking-address)). Set `OBJECT_STORAGE_ENDPOINT_URL` on the dev server to a host the device can reach (`http://10.0.2.2:9000` for the emulator, or the Mac's LAN IP for a physical device) and keep `EXPO_PUBLIC_SERVER_URL` consistent. That is plain `http://`, which Android 9+ blocks by default; dev builds need `expo-build-properties` `android.usesCleartextTraffic: true` ("For Android 9 and above, the default platform-specific value is `false`", [build-properties](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/#pluginconfigtypeandroid)). Production is HTTPS and enforced by `settings.py:287-292`.
- MinIO vs S3: the server signs identically for both (one client, `s3v4`, path-style). MinIO's SigV4 verification checks the same `X-Amz-SignedHeaders` set; production S3 additionally has a bucket policy denying non-TLS and CORS limited to `https://tattwix.in` (`docs/deploy.md:98-103`). CORS is a browser preflight concept and does not apply to native requests, so the native PUT needs no bucket change.

## 3. Alternatives considered

| Option | Why rejected |
| --- | --- |
| `expo/fetch` (the global `fetch` on SDK 57) with the `File` as `body` | Documented as the upload path ("Uploading files using expo/fetch", [FileSystem docs](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#uploading-files-using-expofetch)), but `normalizeBodyInitAsync` reads a Blob/File fully into a `Uint8Array` (`body: new Uint8Array(await blobToArrayBufferAsync(body))`) and sets `Content-Type` from `body.type` ([RequestUtils.ts](https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo/src/winter/fetch/RequestUtils.ts)); there is no upload progress. Acceptable for 8 MiB, but strictly worse than `File.upload`. |
| React Native `fetch` with `body: { uri }` (the pre-Expo idiom) | RN's `convertRequestBody` passes `{uri}` through ([convertRequestBody.js](https://raw.githubusercontent.com/facebook/react-native/0.86-stable/packages/react-native/Libraries/Network/convertRequestBody.js)). Android streams it (`RequestBodyUtil.create(MediaType.parse(contentType), fileInputStream)`, [NetworkingModule.kt](https://raw.githubusercontent.com/facebook/react-native/0.86-stable/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/network/NetworkingModule.kt)) but `contentLength()` is `inputStream.available()`, an estimate, which is risky against a signed `content-length`. iOS fetches the `uri` into one `NSData` first ([RCTNetworking.mm](https://raw.githubusercontent.com/facebook/react-native/0.86-stable/packages/react-native/Libraries/Network/RCTNetworking.mm)). On SDK 57 the global `fetch` is `expo/fetch` unless `EXPO_PUBLIC_USE_RN_FETCH=1` ([expo docs](https://docs.expo.dev/versions/v57.0.0/sdk/expo/#expofetch-api)), so this shape would throw `Unsupported BodyInit type`. |
| RN `Blob` via `fetch(fileUri).then(r => r.blob())` then PUT | Android's `BlobModule` keeps the whole blob as a `ByteArray` and builds `RequestBody.create(MediaType.parse(type), bytes)`; the blob's own `type` overrides the header ([BlobModule.kt](https://raw.githubusercontent.com/facebook/react-native/0.86-stable/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/blob/BlobModule.kt)). Two in-memory copies and the same `expo/fetch` caveat. |
| Legacy `FileSystem.uploadAsync` / `createUploadTask` from `expo-file-system/legacy` | Same native behaviour as `File.upload` (the new API is "legacy-compatible"), but the legacy entry point is deprecated and the root export now throws for it ([FileSystem.uploadAsync](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/#filesystemuploadasyncurl-fileuri-options)). |
| Multipart (`UploadType.MULTIPART`) or a server-proxied upload | The presigned PUT expects raw bytes with a signed `content-type`; multipart would change both. Proxying through Django would defeat the point of presigning and put 8 MiB bodies through the Vercel function. |
| `expo-image-picker` `quality` option instead of `expo-image-manipulator` | `quality` only compresses; it does not cap dimensions, is ignored for PNG on iOS, and does not change HEIC to JPEG under the SDK 54+ defaults ([ImagePickerOptions.quality](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/#imagepickeroptions)). |

## 4. Server-side change needed

None. Confirmed by reading the contract end to end: the views already return everything the native client needs (`url`, `method`, `headers`, `objectKey` for documents), the finalize step validates by HEAD metadata rather than by any browser-specific field, and the signed header set is the same for MinIO and S3 because one client signs both. The only configuration (not code) change is the dev-only `OBJECT_STORAGE_ENDPOINT_URL` host so a device can reach MinIO. Optional later nicety: have `photos/upload/` also return `objectKey` for symmetry, but `complete` does not need it.

## 5. Unverified

- No end-to-end PUT was run against MinIO or S3 from a device. Local MinIO was not running during this research (`curl 127.0.0.1:9000/minio/health/live` returned nothing) and no device/emulator was used. The signed-header set is verified from botocore output; MinIO's enforcement of it is inferred from the SigV4 spec and MinIO being an S3 SigV4 implementation, not from a captured 403.
- Whether OkHttp replaces a caller-supplied `Content-Length` header or sends two. The sketch avoids the question by dropping it, as the web does.
- `expo/fetch` `overrideHeaders`: whether a user `Content-Type` wins over the body-derived one was not visible in the fetched source (`RequestUtils.ts` was summarised, not read verbatim for that function). Irrelevant to the recommended path.
- iOS: the exact behaviour of `sessionType: 'background'` when the JS runtime is alive but the app is backgrounded for longer than the 120 s presigned TTL (the PUT would still be signed at send time; untested).
- `ImageManipulator.resize` with one `null` side is documented as preserving ratio; the EXIF orientation handling of the rendered JPEG was not tested on device.
