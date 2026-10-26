import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createSupportApi, getSupportContacts, supportContactsQuery, SUPPORT_PHONE_PLACEHOLDER } from "@tattvix/api";
import { createApiClient } from "@tattvix/contracts";
import { env } from "@tattvix/env/web";
import { Button } from "@tattvix/ui/components/button";
import { MessageCircle, Phone } from "lucide-react";

import { PageHeader, Panel, PanelHeader, PanelSection } from "@/components/design-system";

export const Route = createFileRoute("/_auth/help")({ component: HelpDeskPage });

const supportApi = createSupportApi(createApiClient({
  baseUrl: env.VITE_SERVER_URL,
  getToken: async () => null,
}));

function HelpDeskPage() {
  const query = useQuery(supportContactsQuery(supportApi));
  const contacts = query.data ? getSupportContacts(query.data) : null;

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-6">
      <PageHeader title="Help desk" />
      <Panel>
        <PanelHeader title="Contact Tattwix" />
        <PanelSection>
          <p className="text-sm text-muted-foreground">Get help with your account, hotel, check-in or anything else on Tattwix.</p>
        </PanelSection>
        {query.isError ? <PanelSection>
          <div className="grid gap-3"><p role="alert" className="text-sm text-destructive">Support contacts could not be refreshed. Please try again.</p><Button variant="outline" className="w-fit" onClick={() => void query.refetch()}>Try again</Button></div>
        </PanelSection> : null}
        {contacts ? (
          <>
            <PanelSection>
              <div className="grid gap-3">
                <p className="text-sm font-medium">WhatsApp</p>
                <p className="text-sm text-muted-foreground">{contacts.whatsapp?.label ?? SUPPORT_PHONE_PLACEHOLDER}</p>
                {contacts.whatsapp ? (
                  <Button className="w-fit" render={<a href={contacts.whatsapp.href} target="_blank" rel="noopener noreferrer" />}><MessageCircle />Chat on WhatsApp</Button>
                ) : <><p className="text-sm text-muted-foreground">WhatsApp support is being set up.</p><Button className="w-fit" disabled><MessageCircle />Chat on WhatsApp</Button></>}
              </div>
            </PanelSection>
            <PanelSection>
              <div className="grid gap-3">
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{contacts.call?.label ?? SUPPORT_PHONE_PLACEHOLDER}</p>
                {contacts.call ? (
                  <Button className="w-fit" variant="outline" render={<a href={contacts.call.href} />}><Phone />Call support</Button>
                ) : <><p className="text-sm text-muted-foreground">Phone support is being set up.</p><Button className="w-fit" variant="outline" disabled><Phone />Call support</Button></>}
              </div>
            </PanelSection>
          </>
        ) : !query.isError ? <PanelSection><p role="status" className="text-sm text-muted-foreground">Loading support contacts…</p></PanelSection> : null}
      </Panel>
    </div>
  );
}
