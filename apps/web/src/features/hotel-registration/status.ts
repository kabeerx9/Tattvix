import type { HotelRegistrationRequest } from "@tattvix/contracts";

export function hasPendingHotelRequest(requests: HotelRegistrationRequest[]) {
  return requests.some((request) => request.status === "PENDING");
}

export function getLatestRejectedRequest(requests: HotelRegistrationRequest[]) {
  const latestRequest = [...requests]
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))[0];

  return latestRequest?.status === "REJECTED" ? latestRequest : undefined;
}
