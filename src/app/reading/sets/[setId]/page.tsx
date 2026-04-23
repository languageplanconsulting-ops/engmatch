import { ReadingSetRuntime } from "@/components/reading/reading-runtime";

export default async function ReadingSetPage(props: PageProps<"/reading/sets/[setId]">) {
  const { setId } = await props.params;
  return <ReadingSetRuntime setId={setId} />;
}
