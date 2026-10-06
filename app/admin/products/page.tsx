import { ProductTable } from "@/features/admin/ProductTable";

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Products</h2>
        <p className="text-muted-foreground mt-1">
          Manage your store&apos;s inventory, pricing, and availability.
        </p>
      </div>
      
      <ProductTable />
    </div>
  );
}
