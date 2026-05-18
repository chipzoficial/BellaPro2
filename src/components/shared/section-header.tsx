export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-heading text-xl font-semibold text-brand-800 sm:text-2xl">{title}</h2>
      {description ? <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p> : null}
    </div>
  );
}
