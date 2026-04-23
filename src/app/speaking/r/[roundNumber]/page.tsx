import { PlaceholderPage } from "@/lib/page-builders";

export default async function SpeakingRoundPage(props: PageProps<"/speaking/r/[roundNumber]">) {
  const { roundNumber } = await props.params;

  return (
    <PlaceholderPage
      title={`Speaking Round ${roundNumber}`}
      description="Grouped speaking practice for this round."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/speaking", label: "Speaking" },
        { label: `Round ${roundNumber}` },
      ]}
      panels={[
        {
          title: "Round overview",
          body: `Use round ${roundNumber} to practise prompts, record responses, and review summaries.`,
        },
      ]}
      links={[{ href: `/speaking/r/${roundNumber}/p/2`, label: "Open part 2 in this round" }]}
    />
  );
}
