import { requirePageRole } from "@/lib/auth/guards";
import { UserManagement } from "@/features/admin/components/user-management";

export default async function AdminPage() {
  const user = await requirePageRole(["admin"]);
  return <UserManagement currentUserId={user.id} />;
}
