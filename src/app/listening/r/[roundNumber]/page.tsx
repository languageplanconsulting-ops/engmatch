import { PlaceholderPage } from "@/lib/page-builders";

export default async function ListeningRoundPage(props: PageProps<"/listening/r/[roundNumber]">) {
  const { roundNumber } = await props.params;

  return (
    <PlaceholderPage
      title={`Listening Round ${roundNumber}`}
      description="Grouped listening practice for this round."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/listening", label: "Listening" },
        { label: `Round ${roundNumber}` },
      ]}
      panels={[
        {
          title: "Round brief",
          body: `Use this route to group all listening sections in round ${roundNumber}.`,
        },
      ]}
      links={[
        {
          href: `/listening/r/${roundNumber}/multiple-choice`,
          label: "Open a category inside this round",
        },
      ]}
    />
  );
}
