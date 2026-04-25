import Link from "next/link";
import { ReadingDbLibrary } from "@/components/reading/reading-db-library";

export default function ReadingPage() {
  return (
    <div className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>Reading</span>
      </nav>
      <ReadingDbLibrary />
    </div>
  );
}
