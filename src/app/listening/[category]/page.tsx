import { PlaceholderPage } from "@/lib/page-builders";

export default async function ListeningCategoryPage(props: PageProps<"/listening/[category]">) {
  const { category } = await props.params;

  return (
    <PlaceholderPage
      title={`Listening Category: ${category}`}
      description="Practice this listening question type with focused drills."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/listening", label: "Listening" },
        { label: category },
      ]}
      panels={[
        {
          title: "Focus",
          body: `Question-specific practice for ${category}.`,
        },
        {
          title: "Practice support",
          body: "Train with category-based questions, transcripts, and review support.",
        },
      ]}
      links={[
        { href: "/listening", label: "Back to listening home" },
        { href: "/listening/r/1", label: "Round 1 overview" },
      ]}
    />
  );
}
