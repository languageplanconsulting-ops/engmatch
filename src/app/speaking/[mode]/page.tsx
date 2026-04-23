import { notFound } from "next/navigation";
import { SpeakingTestBrowser } from "@/components/speaking/speaking-test-browser";
import type { SpeakingMode } from "@/lib/speaking-demo";

const MODES: SpeakingMode[] = ["part-1", "part-2", "part-3", "full-test"];

export default async function SpeakingModePage(props: PageProps<"/speaking/[mode]">) {
  const { mode } = await props.params;

  if (!MODES.includes(mode as SpeakingMode)) {
    notFound();
  }

  return <SpeakingTestBrowser mode={mode as SpeakingMode} />;
}
