import type { ReactNode } from "react";
import { StudentAccessGuard } from "@/components/student-access-guard";

export default function ReadingLayout({ children }: { children: ReactNode }) {
  return <StudentAccessGuard skill="reading">{children}</StudentAccessGuard>;
}
