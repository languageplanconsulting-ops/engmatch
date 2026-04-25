import Link from "next/link";
import { StudentAccessAdmin } from "@/components/admin/student-access-admin";

export default function AdminAccessPage() {
  return (
    <div className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span><Link href="/">Home</Link> / </span>
        <span><Link href="/admin">Admin</Link> / </span>
        <span>Student Access</span>
      </nav>

      <div className="section-header">
        <h2>Student Access & Notifications</h2>
        <p>Grant access by email, adjust expiry dates, and control which IELTS apps each student can open.</p>
      </div>

      <StudentAccessAdmin />
    </div>
  );
}
