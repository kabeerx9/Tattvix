import { queryOptions } from "@tanstack/react-query";
import { supportContactsSchema, type ApiClient, type SupportContacts } from "@tattvix/contracts";

export const SUPPORT_PHONE_PLACEHOLDER = "+91 00000 00000";

export function createSupportApi(client: ApiClient) {
  return {
    get: () => client.requestJson("/api/support/", supportContactsSchema),
  };
}

export function supportContactsQuery(api: ReturnType<typeof createSupportApi>) {
  return queryOptions({
    queryKey: ["support-contacts"] as const,
    queryFn: api.get,
    staleTime: 60_000,
    refetchOnMount: "always",
  });
}

function phoneLabel(phone: string) {
  return /^\+91[0-9]{10}$/.test(phone)
    ? `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`
    : phone;
}

export function getSupportContacts(contacts: SupportContacts) {
  return {
    call: contacts.callPhone ? { label: phoneLabel(contacts.callPhone), href: `tel:${contacts.callPhone}` } : null,
    whatsapp: contacts.whatsappPhone ? { label: phoneLabel(contacts.whatsappPhone), href: `https://wa.me/${contacts.whatsappPhone.slice(1)}` } : null,
  };
}
