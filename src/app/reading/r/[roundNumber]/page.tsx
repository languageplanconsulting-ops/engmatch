import { PlaceholderPage } from "@/lib/page-builders";

export default async function ReadingRoundPage(props: PageProps<"/reading/r/[roundNumber]">) {
  const { roundNumber } = await props.params;

  return (
    <PlaceholderPage
      title={`Reading Round ${roundNumber}`}
      description="Grouped reading practice for this round."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/reading", label: "Reading" },
        { label: `Round ${roundNumber}` },
      ]}
      panels={[
        {
          title: "Round setup",
          body: `Round ${roundNumber} combines passages, timer flow, and section progress.`,
        },
      ]}
      links={[
        {
          href: `/reading/r/${roundNumber}/matching-headings`,
          label: "Open category inside this round",
        },
      ]}
    />
  );
}
