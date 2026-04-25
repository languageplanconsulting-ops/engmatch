import Link from "next/link";
import { ListeningAdminPanel } from "@/components/listening/listening-admin-panel";

export default function AdminListeningPage() {
  return (
    <div className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>Admin Listening</span>
      </nav>
      <div className="section-header">
        <h2>Listening Admin</h2>
        <p>Upload listening sets to Supabase so they are available across laptops and in production.</p>
      </div>
      <ListeningAdminPanel />
    </div>
  );
}
