// Photo pipeline for the native app: pick, shrink to a JPEG, ask the API for a
// signed PUT, send the bytes, then tell the API it landed. Each step runs under
// runUploadStep, so a failure or a stall names its step, status and storage
// error code. Shared by property photos and identity document photos.
// Mirrors apps/web/src/features/property-photos/mutations.ts.
import { runUploadStep } from "@tattvix/api";
import { ApiError, type PropertyPhotoSlot } from "@tattvix/contracts";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { FileSystemUploadType, createUploadTask } from "expo-file-system/legacy";

import { api } from "./api";

const MAX_SIDE = 1600;
export const JPEG_QUALITY = 0.85;

/**
 * Opens the library or the camera and returns the picked asset, or null when the
 * person cancels. Throws an Error with a user-facing message when camera permission
 * is denied. The library needs no permission: Android's photo picker hands over
 * only the photo the person chooses.
 */
export async function pickImage(source: "library" | "camera"): Promise<ImagePicker.ImagePickerAsset | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsMultipleSelection: false };

  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Allow camera access in Settings to take a photo.");
    const picked = await ImagePicker.launchCameraAsync(options);
    if (picked.canceled) return null;
    return picked.assets[0] ?? null;
  }

  const picked = await ImagePicker.launchImageLibraryAsync(options);
  if (picked.canceled) return null;
  return picked.assets[0] ?? null;
}

/**
 * Returns the saved photo, or null when the person cancels the picker.
 * Throws an Error with a user-facing message for permission and upload failures.
 */
export async function pickAndUploadPhoto(organizationSlug: string, propertySlug: string, slot: PropertyPhotoSlot) {
  const asset = await pickImage("library");
  if (!asset) return null;

  const jpeg = await runUploadStep("prepare", () => encodeJpeg(asset.uri, asset.width, asset.height));
  const contentLength = new File(jpeg).size;

  const { upload } = await runUploadStep("authorize", () =>
    api.propertyPhotos.requestUpload(organizationSlug, propertySlug, { ...slot, contentType: "image/jpeg", contentLength }),
  );

  await putSignedUpload(upload.url, upload.headers, jpeg);

  return runUploadStep("confirm", () => api.propertyPhotos.complete(organizationSlug, propertySlug, slot));
}

/**
 * PUTs the bytes to a signed URL as the "send" step. A signed Content-Length is
 * dropped, as the web does: the transport sets it from the body. A non-2xx answer
 * throws with storage's error code (from its XML body); a stall cancels the upload.
 */
export async function putSignedUpload(url: string, headers: Record<string, string>, fileUri: string) {
  const sentHeaders = Object.fromEntries(Object.entries(headers).filter(([name]) => name.toLowerCase() !== "content-length"));
  const task = createUploadTask(url, fileUri, {
    httpMethod: "PUT",
    headers: sentHeaders,
    uploadType: FileSystemUploadType.BINARY_CONTENT,
  });
  await runUploadStep(
    "send",
    async () => {
      const response = await task.uploadAsync();
      if (!response) throw new Error("The upload was cancelled.");
      if (response.status < 200 || response.status > 299) {
        throw new ApiError(response.status, "", /<Code>([^<]+)<\/Code>/.exec(response.body ?? "")?.[1] ?? null);
      }
    },
    undefined,
    () => void task.cancelAsync(),
  );
}

/**
 * Re-encodes as JPEG and scales down only when the longest side exceeds maxSide.
 * Width and height may be 0 when the picker did not report them; they are then read from a render.
 */
export async function encodeJpeg(uri: string, width: number, height: number, maxSide = MAX_SIDE, quality = JPEG_QUALITY) {
  let longest = Math.max(width, height);
  let sourceWidth = width;
  let sourceHeight = height;
  if (!longest) {
    // The picker did not report dimensions; read them from a render of the source.
    const probe = await ImageManipulator.manipulate(uri).renderAsync();
    sourceWidth = probe.width;
    sourceHeight = probe.height;
    longest = Math.max(sourceWidth, sourceHeight);
  }

  const context = ImageManipulator.manipulate(uri);
  const sized = longest > maxSide ? context.resize(sourceWidth >= sourceHeight ? { width: maxSide } : { height: maxSide }) : context;
  const rendered = await sized.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });
  return saved.uri;
}
