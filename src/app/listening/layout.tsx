import { StudentAccessGuard } from "@/components/student-access-guard";

export default function ListeningLayout({ children }: LayoutProps<"/listening">) {
  return <StudentAccessGuard skill="listening">{children}</StudentAccessGuard>;
}
