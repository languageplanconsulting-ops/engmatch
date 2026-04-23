import { PlaceholderPage } from "@/lib/page-builders";

export default async function SpeakingRoundPartPage(
  props: PageProps<"/speaking/r/[roundNumber]/p/[part]">,
) {
  const { roundNumber, part } = await props.params;

  return (
    <PlaceholderPage
      title={`Speaking Round ${roundNumber}, Part ${part}`}
      description="Continue your practice round for this part."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/speaking", label: "Speaking" },
        { href: `/speaking/r/${roundNumber}`, label: `Round ${roundNumber}` },
        { label: `Part ${part}` },
      ]}
      panels={[
        {
          title: "Practice round",
          body: "Record your answers question by question and review your speaking performance.",
        },
      ]}
      links={[
        { href: `/speaking/r/${roundNumber}`, label: "Back to round overview" },
        { href: "/speaking", label: "Back to speaking home" },
      ]}
    />
  );
}
