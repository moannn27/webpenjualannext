import { getAdminCustomersAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomersAction();
  return <section className="space-y-6"><div><h1 className="text-3xl font-bold">Akun</h1><p className="mt-1 text-muted-foreground">Profil akun pelanggan dan admin.</p></div>
    <div className="rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Telepon</TableHead><TableHead>Role</TableHead><TableHead>Bergabung</TableHead></TableRow></TableHeader><TableBody>
      {customers.map((customer) => <TableRow key={customer.id}><TableCell className="font-medium">{customer.full_name || "Belum mengisi nama"}</TableCell><TableCell>{customer.phone || "—"}</TableCell><TableCell><Badge variant={customer.role === "admin" || customer.role === "super_admin" ? "default" : "secondary"}>{customer.role}</Badge></TableCell><TableCell>{new Date(customer.created_at).toLocaleDateString("id-ID")}</TableCell></TableRow>)}
      {!customers.length && <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Belum ada akun.</TableCell></TableRow>}
    </TableBody></Table></div>
  </section>;
}
