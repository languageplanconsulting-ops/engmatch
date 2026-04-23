import { SectionLayout } from "@/lib/page-builders";

export default function ListeningLayout({ children }: LayoutProps<"/listening">) {
  return <SectionLayout section="Listening">{children}</SectionLayout>;
}
