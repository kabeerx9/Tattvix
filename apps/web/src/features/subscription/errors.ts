import { ApiError } from "@/lib/api";

/** The server refused because the hotel's trial has ended (HTTP 402). */
export function isSubscriptionExpiredError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 402 && error.code === "subscription_expired";
}
