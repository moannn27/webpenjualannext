import { getFAQsAction } from "@/actions/content";

export default async function FAQPage() {
  const faqs = await getFAQsAction().catch(() => []);
  return <main className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="mb-2 text-3xl font-bold">Pertanyaan umum</h1><p className="mb-8 text-muted-foreground">Jawaban untuk pertanyaan yang sering diajukan.</p>
    {faqs.length ? <div className="divide-y rounded-2xl border border-border bg-card px-6">{faqs.map((faq) => <details key={faq.id} className="py-5"><summary className="cursor-pointer font-semibold">{faq.question}</summary><p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{faq.answer}</p></details>)}</div> : <p className="rounded-2xl border p-8 text-muted-foreground">Informasi FAQ belum tersedia.</p>}
  </main>;
}
