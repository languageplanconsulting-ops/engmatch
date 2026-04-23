import { notifications } from "@/lib/demo-data";

export default function NotificationsPage() {
  return (
    <section className="stack-lg">
      <div className="section-header">
        <h2>Notifications</h2>
        <p>Practice reminders and progress nudges to keep your study routine on track.</p>
      </div>
      <div className="list-grid">
        {notifications.map((notice) => (
          <article className="list-card" key={notice.id}>
            <h3>{notice.title}</h3>
            <p>{notice.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
