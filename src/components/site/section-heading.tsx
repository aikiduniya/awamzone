export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string | null;
  title?: string | null;
  description?: string | null;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center mx-auto max-w-2xl" : ""}>
      {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
      {title && <h2 className="text-4xl md:text-5xl font-serif text-foreground">{title}</h2>}
      {description && <p className="mt-3 text-sm text-muted-foreground max-w-xl md:max-w-lg leading-relaxed">{description}</p>}
    </div>
  );
}
