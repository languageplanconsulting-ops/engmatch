import { notFound } from "next/navigation";
import { WritingPromptVisual } from "@/components/writing/writing-prompt-visual";
import { WritingResponseWorkspace } from "@/components/writing/writing-response-workspace";
import { getDbWritingPrompt } from "@/lib/db-content";
import { getWritingPrompt } from "@/lib/writing-demo";

export default async function WritingPromptPage(
  props: PageProps<"/writing/prompts/[promptId]">,
) {
  const { promptId } = await props.params;
  const prompt = (await getDbWritingPrompt(promptId)) ?? getWritingPrompt(promptId);

  if (!prompt) {
    notFound();
  }

  return (
    <section className="stack-lg">
      <article className="panel-shell">
        <h2>{prompt.title}</h2>
        <p>{prompt.promptText}</p>
      </article>

      <WritingPromptVisual prompt={prompt} />
      <WritingResponseWorkspace prompt={prompt} />
    </section>
  );
}
