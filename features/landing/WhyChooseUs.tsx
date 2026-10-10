import Link from "next/link";
import { Truck, ShieldCheck, Headphones, CreditCard, MessageCircle, MapPin } from "lucide-react";

interface WhyChooseUsProps {
  title?: string;
  subtitle?: string;
  store?: {
    address?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
  };
  pickupInfo?: {
    store_name?: string;
    store_address?: string;
    maps_url?: string;
  };
}

export function WhyChooseUs({
  title = "Layanan & Kemudahan Belanja",
  subtitle = "Kemudahan menemukan perangkat komputer dan elektronik yang tepat dengan informasi spesifikasi jelas dan alur pemesanan terdata.",
  store,
  pickupInfo,
}: WhyChooseUsProps) {
  const reasons = [
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: "Spesifikasi Lengkap & Terkurasi",
      description: "Informasi spesifikasi teknis prosesor, memori, kartu grafis, dan layar disajikan jelas untuk memudahkan pilihan Anda.",
    },
    {
      icon: <Truck className="h-8 w-8 text-primary" />,
      title: "Pilihan Ambil di Toko & Pengiriman",
      description: "Tersedia pilihan ambil langsung di lokasi toko fisik atau pengiriman pesanan sesuai alamat tujuan Anda.",
    },
    {
      icon: <CreditCard className="h-8 w-8 text-primary" />,
      title: "Pemesanan Terdata & Transparan",
      description: "Setiap transaksi dilengkapi nomor pesanan, detail rekening transfer, serta pemantauan status pesanan di dashboard akun.",
    },
    {
      icon: <Headphones className="h-8 w-8 text-primary" />,
      title: "Bantuan Informasi & Kontak Toko",
      description: "Hubungi admin toko untuk menanyakan ketersediaan produk, cek stok, atau konfirmasi pesanan Anda.",
    },
  ];

  const hasWhatsapp = Boolean(store?.whatsapp);
  const cleanWhatsapp = store?.whatsapp ? store.whatsapp.replace(/\D/g, "") : "";
  const hasPickup = Boolean(pickupInfo?.store_address || store?.address);
  const displayAddress = pickupInfo?.store_address || store?.address || "";

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12 text-center sm:mb-16">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h2>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-8">
        {reasons.map((reason, index) => (
          <div
            key={index}
            className="flex flex-col items-center rounded-[24px] border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:shadow-lg"
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {reason.icon}
            </div>
            <h3 className="mb-3 text-lg font-semibold text-foreground sm:text-xl">{reason.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{reason.description}</p>
          </div>
        ))}
      </div>

      {(hasWhatsapp || hasPickup) && (
        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-5 sm:flex-row sm:p-6 lg:mt-12">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
              <MapPin className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {pickupInfo?.store_name || "Toko Fisik & Layanan Pelanggan"}
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {displayAddress || "Kunjungi toko kami atau konsultasikan spesifikasi dengan tim kami."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasPickup && pickupInfo?.maps_url && (
              <a
                href={pickupInfo.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <MapPin className="size-3.5" />
                Buka Google Maps
              </a>
            )}
            {hasWhatsapp && (
              <a
                href={`https://wa.me/${cleanWhatsapp}?text=Halo%20Next%20Solution%2C%20saya%20ingin%20konsultasi%20produk%20dan%20spesifikasi.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#20ba59]"
              >
                <MessageCircle className="size-3.5" />
                Konsultasi WhatsApp
              </a>
            )}
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Lihat Semua Produk
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
