import { ReadingResultsRuntime } from "@/components/reading/reading-runtime";

export default async function ReadingSetResultsPage(
  props: PageProps<"/reading/sets/[setId]/results">,
) {
  const { setId } = await props.params;
  return <ReadingResultsRuntime setId={setId} />;
}
