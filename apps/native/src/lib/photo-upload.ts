// Property photo pipeline for the native app: pick, shrink to a 1600px JPEG,
// ask the API for a signed PUT, send the bytes, then tell the API it landed.
// Mirrors apps/web/src/features/property-photos/mutations.ts.
import type { PropertyPhotoSlot } from "@tattvix/contracts";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { FileSystemUploadType, uploadAsync } from "expo-file-system/legacy";

import { api } from "./api";

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Returns the saved photo, or null when the person cancels the picker.
 * Throws an Error with a user-facing message for permission and upload failures.
 */
export async function pickAndUploadPhoto(organizationSlug: string, propertySlug: string, slot: PropertyPhotoSlot) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("Allow photo access in Settings to add a photo.");

  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, allowsMultipleSelection: false });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if (!asset) return null;

  const jpeg = await encodeJpeg(asset.uri, asset.width, asset.height);
  const contentLength = new File(jpeg).size;

  const { upload } = await api.propertyPhotos.requestUpload(organizationSlug, propertySlug, {
    ...slot,
    contentType: "image/jpeg",
    contentLength,
  });

  // Drop a signed Content-Length, as the web does: the transport sets it from the body.
  const headers = Object.fromEntries(Object.entries(upload.headers).filter(([name]) => name.toLowerCase() !== "content-length"));
  const response = await uploadAsync(upload.url, jpeg, {
    httpMethod: "PUT",
    headers,
    uploadType: FileSystemUploadType.BINARY_CONTENT,
  });
  if (response.status < 200 || response.status > 299) throw new Error("The photo could not be uploaded.");

  return api.propertyPhotos.complete(organizationSlug, propertySlug, slot);
}

/** Re-encodes as JPEG and scales down only when the longest side exceeds MAX_SIDE. */
async function encodeJpeg(uri: string, width: number, height: number) {
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
  const sized = longest > MAX_SIDE ? context.resize(sourceWidth >= sourceHeight ? { width: MAX_SIDE } : { height: MAX_SIDE }) : context;
  const rendered = await sized.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return saved.uri;
}
