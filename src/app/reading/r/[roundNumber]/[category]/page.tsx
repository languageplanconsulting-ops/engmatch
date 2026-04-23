import { PlaceholderPage } from "@/lib/page-builders";

export default async function ReadingRoundCategoryPage(
  props: PageProps<"/reading/r/[roundNumber]/[category]">,
) {
  const { roundNumber, category } = await props.params;

  return (
    <PlaceholderPage
      title={`Reading Round ${roundNumber}: ${category}`}
      description="Category practice inside this reading round."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/reading", label: "Reading" },
        { href: `/reading/r/${roundNumber}`, label: `Round ${roundNumber}` },
        { label: category },
      ]}
      panels={[
        {
          title: "Category focus",
          body: `Practice ${category} questions in round ${roundNumber}.`,
        },
      ]}
      links={[
        { href: `/reading/r/${roundNumber}`, label: "Back to round overview" },
        { href: "/reading", label: "Back to reading home" },
      ]}
    />
  );
}
