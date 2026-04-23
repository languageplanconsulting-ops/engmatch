import { SectionLayout } from "@/lib/page-builders";
import type { ReactNode } from "react";

export default function ReadingLayout({ children }: { children: ReactNode }) {
  return <SectionLayout section="Reading">{children}</SectionLayout>;
}
