import { requirePageRole } from "@/lib/auth/guards";
import { ProjectManagement } from "@/features/admin/components/project-management";

export default async function AdminProjectsPage() {
  await requirePageRole(["admin"]);
  return <ProjectManagement />;
}
