import { notFound } from "next/navigation";
import { SpeakingSessionLoader } from "@/components/speaking/speaking-session-runner";
import type { SpeakingMode } from "@/lib/speaking-demo";

const MODES: SpeakingMode[] = ["part-1", "part-2", "part-3", "full-test"];

export default async function SpeakingTestPage(
  props: PageProps<"/speaking/[mode]/[testId]">,
) {
  const { mode, testId } = await props.params;

  if (!MODES.includes(mode as SpeakingMode)) {
    notFound();
  }

  return <SpeakingSessionLoader mode={mode as SpeakingMode} testId={testId} />;
}
