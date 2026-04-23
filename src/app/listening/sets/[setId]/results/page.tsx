import { PlaceholderPage } from "@/lib/page-builders";

export default async function ListeningSetResultsPage(
  props: PageProps<"/listening/sets/[setId]/results">,
) {
  const { setId } = await props.params;

  return (
    <PlaceholderPage
      title={`Listening Results: ${setId}`}
      description="Review your score summary, transcript notes, and retry options."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/listening", label: "Listening" },
        { href: `/listening/sets/${setId}`, label: setId },
        { label: "Results" },
      ]}
      panels={[
        {
          title: "Score summary",
          body: "Check performance breakdown and identify sections to improve.",
        },
      ]}
      links={[{ href: "/listening/analytics", label: "Listening analytics" }]}
    />
  );
}
