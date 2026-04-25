import type { ReactNode } from "react";
import { requireAdminAuth } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminAuth();

  return children;
}
