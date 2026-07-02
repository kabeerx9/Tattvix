type PlaceholderPageProps = {
  title: string;
  eyebrow: string;
  description: string;
};

export function PlaceholderPage({ title, eyebrow, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="grid min-h-[360px] place-items-center border bg-card p-8 text-center">
        <div className="max-w-md">
          <p className="text-sm font-medium">Empty for now</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This route is wired into the authenticated dashboard shell and ready for the
            first real product workflow.
          </p>
        </div>
      </div>
    </div>
  );
}
