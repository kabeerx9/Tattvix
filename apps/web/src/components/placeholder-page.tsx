import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { Button } from "@tattvix/ui/components/button";
import { PageHeader, Surface } from "@/components/design-system";

type PlaceholderPageProps = { title: string; eyebrow: string; description: string };
export function PlaceholderPage({ title, eyebrow, description }: PlaceholderPageProps) {
  return <div className="mx-auto grid max-w-[1400px] gap-7"><PageHeader eyebrow={eyebrow} title={title} description={description} action={<Button className="h-10 rounded-xl"><ArrowUpRight className="size-4" /> Create new</Button>} /><Surface className="overflow-hidden"><div className="flex items-center justify-between border-b p-5"><div className="flex h-10 w-full max-w-sm items-center gap-2 rounded-xl bg-muted px-3 text-muted-foreground"><Search className="size-4" /><span className="text-xs">Search {title.toLowerCase()}...</span></div></div><div className="grid min-h-[380px] place-items-center p-8 text-center"><div className="max-w-sm"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary"><Sparkles className="size-6" /></span><h2 className="mt-5 text-lg font-semibold">A clean slate for {title.toLowerCase()}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">This workspace is ready for the first real workflow. New records and activity will appear here.</p></div></div></Surface></div>;
}
