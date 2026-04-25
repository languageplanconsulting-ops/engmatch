import Link from "next/link";
import { getDbListeningSets } from "@/lib/db-content";
import { demoSets } from "@/lib/demo-data";

export default async function ListeningPage() {
  const remoteSets = await getDbListeningSets();
  const sets = remoteSets.length > 0 ? remoteSets : demoSets.listening;

  return (
    <div className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>Listening</span>
      </nav>
      <div className="section-header">
        <h2>Listening Lab</h2>
        <p>Listening sets uploaded by admin are stored in Supabase and appear here across laptops.</p>
      </div>
      <div className="route-grid">
        {sets.map((set) => (
          <Link className="route-card" href={`/listening/sets/${set.id}`} key={set.id}>
            <span>{set.title}</span>
            <strong>{("level" in set ? set.level : "Ready")}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}
