import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getStudentSessionEmail } from "@/lib/student-access";

export default async function NotificationsPage() {
  const isAdmin = await isAdminAuthenticated();
  const email = await getStudentSessionEmail();
  if (!email && !isAdmin) {
    redirect("/?login=required");
  }

  const notifications = isAdmin
    ? await prisma.studentNotification.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
      })
    : await prisma.studentNotification.findMany({
        where: { email },
        orderBy: { createdAt: "desc" },
      });

  return (
    <section className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>Notifications</span>
      </nav>
      <div className="section-header">
        <h2>Notifications</h2>
        <p>
          {isAdmin
            ? <>Admin preview of recent student notifications across the app.</>
            : <>Updates for <strong>{email}</strong>, including access changes and teacher notices.</>}
        </p>
      </div>
      <div className="list-grid">
        {notifications.map((notice) => (
          <article className="list-card" key={notice.id}>
            <h3>{notice.title}</h3>
            <p className="meta">{notice.email}</p>
            <p>{notice.description}</p>
            <p className="meta">{new Date(notice.createdAt).toLocaleString()}</p>
          </article>
        ))}
        {notifications.length === 0 ? (
          <article className="list-card">
            <h3>No notifications yet</h3>
            <p>
              {isAdmin
                ? "Student notifications will appear here after access changes or manual messages are sent."
                : "Your admin updates will show up here after they grant access or send a note."}
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
