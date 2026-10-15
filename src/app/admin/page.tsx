import Link from "next/link";
import { requirePageRole } from "@/lib/auth/guards";
import { UserManagement } from "@/features/admin/components/user-management";

export default async function AdminPage() {
  const user = await requirePageRole(["admin"]);
  return <>
    <div className="mx-auto max-w-6xl px-6 pt-10"><Link href="/admin/projects" className="inline-flex rounded-lg border border-green-200 px-4 py-2 text-sm font-semibold text-[#005000]">Administrar proyectos →</Link></div>
    <UserManagement currentUserId={user.id} />
  </>;
}
