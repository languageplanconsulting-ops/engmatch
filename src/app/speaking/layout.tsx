import { StudentAccessGuard } from "@/components/student-access-guard";

export default function SpeakingLayout({ children }: LayoutProps<"/speaking">) {
  return <StudentAccessGuard skill="speaking">{children}</StudentAccessGuard>;
}
