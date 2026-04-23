import Link from "next/link";
import { ReadingLibraryClient } from "@/components/reading/reading-runtime";

export default function ReadingPage() {
  return (
    <div className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>Reading</span>
      </nav>

      <ReadingLibraryClient />
    </div>
  );
}
