import Link from "next/link";

const groups = [
  { title: "Belanja", links: [["Semua produk", "/products"], ["Kategori", "/category"], ["Brand", "/brands"], ["Promo", "/promo"]] },
  { title: "Akun", links: [["Profil", "/profile"], ["Wishlist", "/wishlist"], ["Keranjang", "/cart"]] },
  { title: "Bantuan", links: [["FAQ", "/faq"], ["Login", "/login"], ["Buat akun", "/register"]] },
];

export function Footer({ settings }: { settings?: { description: string; address: string; email: string; phone: string; whatsapp: string; copyright: string; branches: { id: string; name: string; address: string; maps_url: string }[] } }) {
  const store = settings ?? { description: "Temukan perangkat elektronik dan aksesori pilihan untuk kebutuhanmu.", address: "", email: "", phone: "", whatsapp: "", copyright: "Hak cipta dilindungi.", branches: [] };
  const hasContact = Boolean(store.address || store.email || store.phone || store.whatsapp);
  const hasBranches = Boolean(store.branches?.length);
  const columnCount = 4 + Number(hasContact) + Number(hasBranches);
  const columnsClass = columnCount === 6 ? "lg:grid-cols-6" : columnCount === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";
  return <footer className="border-t bg-background pt-12 pb-8">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className={`grid gap-8 border-b border-border pb-10 sm:grid-cols-2 ${columnsClass}`}>
        <div>
          <Link href="/" className="mb-4 inline-block text-2xl font-bold tracking-tight text-primary">Next Solution</Link>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">{store.description}</p>
          <Link href="/register" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">Buat akun untuk mulai belanja</Link>
        </div>
        {groups.map((group) => <nav key={group.title} aria-label={group.title}><h2 className="mb-4 font-semibold">{group.title}</h2><ul className="space-y-3">{group.links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-primary">{label}</Link></li>)}</ul></nav>)}
        {(store.address || store.email || store.phone || store.whatsapp) && <section><h2 className="mb-4 font-semibold">Hubungi kami</h2><ul className="space-y-3 text-sm text-muted-foreground">{store.address && <li>{store.address}</li>}{store.email && <li><a className="hover:text-primary" href={`mailto:${store.email}`}>{store.email}</a></li>}{store.phone && <li><a className="hover:text-primary" href={`tel:${store.phone}`}>{store.phone}</a></li>}{store.whatsapp && <li><a className="hover:text-primary" href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a></li>}</ul></section>}
        {hasBranches && <section><h2 className="mb-4 font-semibold">Lokasi cabang</h2><ul className="space-y-4">{store.branches.map((branch) => <li key={branch.id} className="space-y-1"><p className="text-sm font-medium">{branch.name}</p><p className="text-sm leading-5 text-muted-foreground">{branch.address}</p>{branch.maps_url && <a className="text-sm font-medium text-primary hover:underline" href={branch.maps_url} target="_blank" rel="noreferrer">Lihat di Google Maps</a>}</li>)}</ul></section>}
      </div>
      <p className="pt-6 text-center text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Next Solution Store. {store.copyright}</p>
    </div>
  </footer>;
}
