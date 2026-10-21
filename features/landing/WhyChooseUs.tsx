import Link from "next/link";
import { ShieldCheck, UserCheck, BadgePercent, Award, MessageCircle, MapPin, ArrowRight } from "lucide-react";

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
  title = "Mengapa Berbelanja di Next Solution?",
  subtitle = "Solusi perangkat komputasi terpercaya dengan konsultasi spesifikasi tepat dan jaminan purna jual resmi.",
  store,
  pickupInfo,
}: WhyChooseUsProps) {
  const reasons = [
    {
      icon: <ShieldCheck className="size-7 sm:size-8 text-primary group-hover:text-white transition-colors" />,
      title: "100% Produk Original",
      description: "Unit baru dan bergaransi resmi dari distributor utama tanpa kompromi keaslian.",
    },
    {
      icon: <UserCheck className="size-7 sm:size-8 text-primary group-hover:text-white transition-colors" />,
      title: "Konsultan Spesifikasi Terlatih",
      description: "Bantuan spesifikasi objektif yang disesuaikan dengan kebutuhan kerja, studi, maupun kreasi Anda.",
    },
    {
      icon: <BadgePercent className="size-7 sm:size-8 text-primary group-hover:text-white transition-colors" />,
      title: "Harga & Penawaran Terbaik",
      description: "Penawaran harga transparan, promo berkala, dan pilihan metode pembayaran yang aman.",
    },
    {
      icon: <Award className="size-7 sm:size-8 text-primary group-hover:text-white transition-colors" />,
      title: "Garansi & Kepuasan Terjamin",
      description: "Dukungan purna jual responsif, panduan instalasi awal, dan bantuan klaim garansi.",
    },
  ];

  const hasWhatsapp = Boolean(store?.whatsapp);
  const cleanWhatsapp = store?.whatsapp ? store.whatsapp.replace(/\D/g, "") : "";
  const hasPickup = Boolean(pickupInfo?.store_address || store?.address);
  const displayAddress = pickupInfo?.store_address || store?.address || "";
  const activeMapsUrl = pickupInfo?.maps_url || store?.maps_url;

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Outer Card Container */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1C23] p-6 sm:p-10 lg:p-12 shadow-xs">
        {/* Header Section */}
        <div className="mb-10 sm:mb-12 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* 4 Cards with Elevated Top-Tab Icon Badges (Ref: Image No. 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6 pt-6">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="group relative rounded-3xl bg-[#F8F9FA] dark:bg-white/5 border border-slate-200/80 dark:border-white/10 pt-10 pb-6 px-5 text-center shadow-2xs hover:shadow-lg hover:bg-white dark:hover:bg-white/10 hover:border-primary/40 transition-all duration-300 flex flex-col items-center justify-between"
            >
              {/* Protruding Top Icon Tab */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <div className="size-13 sm:size-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-white/10 shadow-md flex items-center justify-center text-primary dark:text-blue-400 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  {reason.icon}
                </div>
              </div>

              <div className="w-full flex flex-col items-center">
                <h3 className="mb-2 text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors">
                  {reason.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[220px]">
                  {reason.description}
                </p>
              </div>

              {/* Bottom Arrow Indicator */}
              <div className="mt-5 pt-1">
                <div className="size-8 rounded-full border border-slate-200/80 dark:border-white/10 bg-white dark:bg-black/20 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:border-primary group-hover:scale-110 transition-all duration-300 shadow-2xs">
                  <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Store & Contact Bar */}
        {(hasWhatsapp || hasPickup) && (
          <div className="mt-10 sm:mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 sm:p-5 sm:flex-row shadow-2xs">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-black/30 border border-slate-200/60 dark:border-white/5 text-primary sm:flex shadow-2xs">
                <MapPin className="size-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {pickupInfo?.store_name || "Toko Fisik & Layanan Pelanggan"}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  {displayAddress || "Kunjungi toko kami atau konsultasikan kebutuhan perangkat Anda secara langsung."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasPickup && activeMapsUrl && (
                <a
                  href={activeMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:border-primary shadow-2xs cursor-pointer"
                >
                  <MapPin className="size-3" />
                  Buka Maps
                </a>
              )}
              {hasWhatsapp && (
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=Halo%20Next%20Solution%2C%20saya%20ingin%20konsultasi%20spesifikasi%20produk.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#20ba59] cursor-pointer"
                >
                  <MessageCircle className="size-3" />
                  Konsultasi WhatsApp
                </a>
              )}
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
              >
                Katalog Produk
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
