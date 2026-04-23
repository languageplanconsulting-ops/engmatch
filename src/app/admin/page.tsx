import Link from "next/link";

const ADMIN_SECTIONS = [
  {
    href: "/admin/speaking",
    icon: "🎙️",
    title: "Speaking Upload",
    desc: "Upload Part 1, Part 2, and Part 3 question packs. Generate AI examiner voice per question.",
    badge: "New",
  },
  {
    href: "/admin/writing",
    icon: "✍️",
    title: "Writing Admin",
    desc: "Manage writing prompts, review student submissions, and run Quick Review.",
  },
  {
    href: "/admin/writing/quick",
    icon: "⚡",
    title: "Quick Review",
    desc: "Paste any essay, annotate inline, score IELTS criteria, and export a PDF — no submission needed.",
  },
  {
    href: "/admin/writing/reviews",
    icon: "📬",
    title: "Student Reviews",
    desc: "View and grade submitted writing tasks from students.",
  },
  {
    href: "/admin/reading",
    icon: "📖",
    title: "Reading Admin",
    desc: "Upload and manage reading question sets.",
  },
  {
    href: "/admin/listening",
    icon: "🎧",
    title: "Listening Admin",
    desc: "Upload and manage listening audio and question sets.",
  },
];

export default function AdminHubPage() {
  return (
    <div className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span><Link href="/">Home</Link> / </span>
        <span>Admin</span>
      </nav>

      <div className="section-header">
        <h2>Teacher / Admin</h2>
        <p>Manage content across all four IELTS skills.</p>
      </div>

      <div className="admin-hub-grid">
        {ADMIN_SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="admin-hub-card">
            <div className="admin-hub-card-top">
              <span className="admin-hub-icon">{s.icon}</span>
              {s.badge && <span className="admin-hub-badge">{s.badge}</span>}
            </div>
            <strong className="admin-hub-title">{s.title}</strong>
            <p className="admin-hub-desc">{s.desc}</p>
            <span className="admin-hub-cta">Open →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
