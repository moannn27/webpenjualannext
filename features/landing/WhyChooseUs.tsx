import Link from "next/link";
import { Truck, ShieldCheck, Headphones, CreditCard, MessageCircle, MapPin } from "lucide-react";

interface WhyChooseUsProps {
  title?: string;
  subtitle?: string;
  store?: {
    address?: string;
    maps_url?: string;
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
  const activeMapsUrl = pickupInfo?.maps_url || store?.maps_url;

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Outer White Card Container (Matching Reference Aesthetic) */}
      <div className="rounded-[32px] sm:rounded-[36px] bg-white dark:bg-[#1E2028] p-6 sm:p-8 lg:p-10 shadow-sm border border-slate-100 dark:border-white/5">
        <div className="mb-8 sm:mb-12 text-center">
          <span className="inline-block text-xs font-bold tracking-wider text-primary uppercase mb-2">
            KEUNGGULAN LAYANAN
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
            {title}
          </h2>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="flex flex-col items-center rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-[#F8F9FA] dark:bg-white/5 p-6 text-center shadow-2xs transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-white/20"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-black/30 border border-slate-200/60 dark:border-white/5 shadow-2xs">
                {reason.icon}
              </div>
              <h3 className="mb-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white">{reason.title}</h3>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">{reason.description}</p>
            </div>
          ))}
        </div>

        {(hasWhatsapp || hasPickup) && (
          <div className="mt-8 sm:mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-[#F8F9FA] dark:bg-white/5 p-5 sm:flex-row sm:p-6 shadow-2xs">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-black/30 border border-slate-200/60 dark:border-white/5 text-primary sm:flex shadow-2xs">
                <MapPin className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {pickupInfo?.store_name || "Toko Fisik & Layanan Pelanggan"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {displayAddress || "Kunjungi toko kami atau konsultasikan spesifikasi dengan tim kami."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {hasPickup && activeMapsUrl && (
                <a
                  href={activeMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:border-primary shadow-2xs cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#20ba59] cursor-pointer"
                >
                  <MessageCircle className="size-3.5" />
                  Konsultasi WhatsApp
                </a>
              )}
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
              >
                Lihat Semua Produk
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
