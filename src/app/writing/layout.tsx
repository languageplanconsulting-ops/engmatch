import { StudentAccessGuard } from "@/components/student-access-guard";

export default function WritingLayout({ children }: LayoutProps<"/writing">) {
  return <StudentAccessGuard skill="writing">{children}</StudentAccessGuard>;
}
