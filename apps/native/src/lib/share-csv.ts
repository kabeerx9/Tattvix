// Share the register CSV through the OS sheet. The blob comes from the API
// client; it is written to the cache directory and handed to the share sheet.
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("The CSV could not be read."));
    reader.readAsText(blob);
  });
}

export async function shareCsv(blob: Blob, filename: string) {
  const text = await readBlobAsText(blob);
  const file = new File(Paths.cache, filename);
  await file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Share register" });
}
