type Point = { day: string; orders: number; revenue: number };

export function SalesChart({ points, days = 30 }: { points: Point[]; days?: number }) {
  const width = 900;
  const height = 240;
  const inset = { x: 44, y: 16, bottom: 34 };
  const plotWidth = width - inset.x - 12;
  const plotHeight = height - inset.y - inset.bottom;
  const maximum = Math.max(1, ...points.map((point) => point.revenue));
  const maximumOrders = Math.max(1, ...points.map((point) => point.orders));
  const coordinates = points.map((point, index) => ({
    x: inset.x + (points.length <= 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1)),
    y: inset.y + plotHeight - point.revenue / maximum * plotHeight,
    ...point,
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const orderCoordinates = coordinates.map((point) => ({ ...point, orderY: inset.y + plotHeight - point.orders / maximumOrders * plotHeight }));
  const ordersLine = orderCoordinates.map((point) => `${point.x},${point.orderY}`).join(" ");
  const tickValues = [maximum, maximum / 2, 0];
  const labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const compactMoney = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}jt` : value >= 1_000 ? `${Math.round(value / 1_000)}rb` : Math.round(value).toLocaleString("id-ID");

  return <div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-4"><div><p className="text-2xl font-bold">{days} hari terakhir</p><p className="text-sm text-muted-foreground">Pendapatan dan jumlah pesanan selesai per hari</p></div><div className="flex flex-wrap items-center gap-4 text-xs"><span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-primary" />Penjualan (Rp)</span><span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-500" />Pesanan selesai</span><span className="text-right text-sm font-semibold">{points.reduce((total, point) => total + point.orders, 0).toLocaleString("id-ID")} pesanan</span></div></div>
    <div role="img" aria-label="Grafik pendapatan harian pesanan selesai selama 30 hari terakhir" className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="none">
        {tickValues.map((value, index) => {
          const y = inset.y + index * plotHeight / 2;
          return <g key={index}><line x1={inset.x} y1={y} x2={width - 12} y2={y} stroke="currentColor" strokeOpacity=".12" strokeDasharray="4 5" /><text x="0" y={y + 4} fill="currentColor" opacity=".65" fontSize="12">{compactMoney(value)}</text></g>;
        })}
        {coordinates.length > 1 && <polygon points={`${inset.x},${inset.y + plotHeight} ${line} ${width - 12},${inset.y + plotHeight}`} fill="currentColor" opacity=".08" />}
        {coordinates.length > 1 && <polyline points={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="text-primary" />}
        {coordinates.length > 1 && <polyline points={ordersLine} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="7 4" />}
        {coordinates.map((point) => <circle key={point.day} cx={point.x} cy={point.y} r="3" fill="currentColor" className="text-primary"><title>{point.day}: Rp {point.revenue.toLocaleString("id-ID")} · {point.orders} pesanan selesai</title></circle>)}
        {orderCoordinates.map((point) => <circle key={`orders-${point.day}`} cx={point.x} cy={point.orderY} r="2.5" fill="#10b981"><title>{point.day}: {point.orders} pesanan selesai</title></circle>)}
        {labelIndexes.map((index) => coordinates[index] && <text key={index} x={coordinates[index].x} y={height - 5} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} fill="currentColor" opacity=".65" fontSize="12">{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(new Date(`${coordinates[index].day}T12:00:00+07:00`))}</text>)}
      </svg>
    </div>
    {!points.some((point) => point.revenue > 0) && <p className="mt-2 text-center text-sm text-muted-foreground">Belum ada pesanan selesai dalam periode ini.</p>}
  </div>;
}
