import Link from "next/link";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-8 rounded-3xl border border-border bg-card px-6 py-8 sm:px-9 sm:py-10">
        <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{intro}</p>
      </header>
      <article className="divide-y divide-border rounded-2xl border border-border bg-card px-6 sm:px-8">
        {sections.map((section) => (
          <section key={section.title} className="py-6 first:pt-7 last:pb-7">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-7 text-muted-foreground">{paragraph}</p>
            ))}
          </section>
        ))}
      </article>
      <p className="mt-6 text-sm text-muted-foreground">
        Masih ada pertanyaan? Kunjungi halaman{" "}
        <Link href="/about" className="font-medium text-primary underline underline-offset-4">Tentang Kami</Link>.
      </p>
    </main>
  );
}
