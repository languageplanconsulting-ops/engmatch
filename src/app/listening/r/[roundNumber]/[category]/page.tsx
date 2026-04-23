import { PlaceholderPage } from "@/lib/page-builders";

export default async function ListeningRoundCategoryPage(
  props: PageProps<"/listening/r/[roundNumber]/[category]">,
) {
  const { roundNumber, category } = await props.params;

  return (
    <PlaceholderPage
      title={`Round ${roundNumber}: ${category}`}
      description="Category practice inside this listening round."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/listening", label: "Listening" },
        { href: `/listening/r/${roundNumber}`, label: `Round ${roundNumber}` },
        { label: category },
      ]}
      panels={[
        {
          title: "Prompt set",
          body: `Practice ${category} questions in round ${roundNumber}.`,
        },
      ]}
      links={[
        { href: `/listening/r/${roundNumber}`, label: "Back to round overview" },
        { href: "/listening", label: "Back to listening home" },
      ]}
    />
  );
}
