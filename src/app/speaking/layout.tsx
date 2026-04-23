import { SectionLayout } from "@/lib/page-builders";

export default function SpeakingLayout({ children }: LayoutProps<"/speaking">) {
  return <SectionLayout section="Speaking">{children}</SectionLayout>;
}
