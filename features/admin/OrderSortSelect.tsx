"use client";

import { useRouter } from "next/navigation";

interface OrderSortSelectProps {
  defaultValue: string;
  filterStatus?: string;
  filterSearch?: string;
}

export function OrderSortSelect({
  defaultValue,
  filterStatus,
  filterSearch,
}: OrderSortSelectProps) {
  const router = useRouter();

  return (
    <select
      name="sort"
      defaultValue={defaultValue}
      onChange={(e) => {
        const val = e.target.value;
        const params = new URLSearchParams();
        if (filterStatus) params.set("status", filterStatus);
        if (filterSearch) params.set("search", filterSearch);
        if (val && val !== "date_desc") params.set("sort", val);
        const qs = params.toString();
        router.push(`/admin/orders${qs ? `?${qs}` : ""}`);
      }}
      className="h-10 rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#F8F9FA] dark:bg-white/5 px-3 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      aria-label="Urutkan pesanan"
    >
      <option value="date_desc">Tanggal Terbaru</option>
      <option value="date_asc">Tanggal Terlama</option>
      <option value="amount_desc">Total Tertinggi</option>
      <option value="amount_asc">Total Terendah</option>
    </select>
  );
}

