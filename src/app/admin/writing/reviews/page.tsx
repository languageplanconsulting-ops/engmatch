import Link from "next/link";
import { teacherInbox } from "@/lib/writing-demo";

export default function AdminWritingReviewsPage() {
  return (
    <section className="stack-lg">
      <div className="section-header">
        <h2>Teacher review inbox</h2>
        <p>
          New student submissions arrive here as notifications. Open one to mark the
          script, score each criterion, and return the feedback.
        </p>
      </div>

      <div className="teacher-inbox-list">
        {teacherInbox.map((item) => (
          <Link className="inbox-card" href={`/admin/writing/reviews/${item.id}`} key={item.id}>
            <div className="inbox-card-top">
              <span>{item.task.toUpperCase()}</span>
              <strong>{item.status}</strong>
            </div>
            <h4>{item.studentName}</h4>
            <p>{item.title}</p>
            <div className="status-chip-row">
              <span className="status-chip">{item.topic}</span>
              <span className="status-chip">{item.submittedAt}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
