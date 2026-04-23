import Link from "next/link";
import { writingTasks } from "@/lib/writing-demo";

export default function WritingPage() {
  return (
    <section className="simple-writing-menu">
      {writingTasks.map((task) => (
        <Link className="simple-writing-link" href={task.href} key={task.slug}>
          {task.title}
        </Link>
      ))}
    </section>
  );
}
