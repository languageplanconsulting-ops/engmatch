import { SectionLayout } from "@/lib/page-builders";

export default function WritingLayout({ children }: LayoutProps<"/writing">) {
  return <SectionLayout section="Writing">{children}</SectionLayout>;
}
