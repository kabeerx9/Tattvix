// A photo upload is four steps, and a failure says which one broke and why,
// so the person sees more than "it didn't work" and a report names the cause.
// Shared by property photos and identity document photos on web and native.
import { ApiError } from "@tattvix/contracts";

import { classifyApiError } from "./errors";

export type UploadStep =
  /** Reading and shrinking the picked image on the device. */
  | "prepare"
  /** Asking the API for a signed upload. */
  | "authorize"
  /** Sending the bytes to storage with that signed upload. */
  | "send"
  /** Telling the API the bytes landed. */
  | "confirm";

/** Long enough for a slow mobile upload of an 8 MB photo; after this the step is abandoned. */
export const UPLOAD_STEP_TIMEOUT_MS = 60_000;

export class UploadStepError extends Error {
  readonly step: UploadStep;
  /** HTTP status when the step got a response; null for no response, a timeout or a device error. */
  readonly status: number | null;
  readonly timedOut: boolean;
  readonly cause: unknown;

  constructor(step: UploadStep, cause: unknown, { status = null, timedOut = false }: { status?: number | null; timedOut?: boolean } = {}) {
    super(uploadStepMessage(step, cause, status, timedOut));
    this.name = "UploadStepError";
    this.step = step;
    this.status = status;
    this.timedOut = timedOut;
    this.cause = cause;
  }
}

const stepFailure: Record<UploadStep, string> = {
  prepare: "The photo could not be read on this device",
  authorize: "Tattwix could not start the upload",
  send: "The photo did not reach storage",
  confirm: "The photo uploaded but could not be saved",
};

function uploadStepMessage(step: UploadStep, cause: unknown, status: number | null, timedOut: boolean) {
  if (timedOut) return `${stepFailure[step]}: it took too long. Check your connection and try again.`;
  // Our API's own message is already written for people (a 400 says what was wrong with the photo);
  // storage's is not, so a failed send keeps the step and status.
  if (step !== "send" && cause instanceof ApiError && cause.status >= 400 && cause.status < 500 && cause.message) return cause.message;
  if (status === null && (step === "authorize" || step === "confirm") && classifyApiError(cause).kind === "network") {
    return `${stepFailure[step]}: no connection. Try again.`;
  }
  // Storage's own code (such as SignatureDoesNotMatch) rides along: it names the cause in a screenshot.
  const code = cause instanceof ApiError && cause.code ? `, ${cause.code}` : "";
  return `${stepFailure[step]}${status ? ` (error ${status}${code})` : ""}. Try again.`;
}

/** Runs one step: a failure, or no answer within the timeout, becomes an UploadStepError for that step. */
export async function runUploadStep<T>(step: UploadStep, work: () => Promise<T>, timeoutMs = UPLOAD_STEP_TIMEOUT_MS, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.();
      reject(new UploadStepError(step, null, { timedOut: true }));
    }, timeoutMs);
  });
  try {
    return await Promise.race([work(), timeout]);
  } catch (error) {
    if (error instanceof UploadStepError) throw error;
    throw new UploadStepError(step, error, { status: error instanceof ApiError ? error.status : null });
  } finally {
    clearTimeout(timer);
  }
}
