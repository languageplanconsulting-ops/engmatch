import Link from "next/link";
import { getDbWritingPrompts } from "@/lib/db-content";
import { getWritingTaskLabel, writingExamBundle, writingPrompts, type WritingTaskSlug } from "@/lib/writing-demo";

export default async function WritingTaskPage(props: PageProps<"/writing/[task]">) {
  const { task } = await props.params;
  const typedTask = task as WritingTaskSlug;
  const remotePrompts = await getDbWritingPrompts();
  const promptSource = remotePrompts.length > 0 ? remotePrompts : writingPrompts;

  const prompts =
    typedTask === "full-exam"
      ? promptSource.filter((prompt) => writingExamBundle.promptIds.includes(prompt.id))
      : promptSource.filter((prompt) => prompt.task === typedTask);

  return (
    <section className="simple-question-list">
      <h2>{getWritingTaskLabel(typedTask)}</h2>
      <div className="prompt-bank">
        {prompts.map((prompt) => (
          <article className="prompt-bank-card" key={prompt.id}>
            <h4>{prompt.title}</h4>
            <p>{prompt.uploadedAt}</p>
            <div className="workspace-actions">
              <Link className="action-button action-button-primary" href={`/writing/prompts/${prompt.id}`}>
                Open
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
