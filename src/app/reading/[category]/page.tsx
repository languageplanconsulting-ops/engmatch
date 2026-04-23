import { PlaceholderPage } from "@/lib/page-builders";

export default async function ReadingCategoryPage(props: PageProps<"/reading/[category]">) {
  const { category } = await props.params;

  return (
    <PlaceholderPage
      title={`Reading Category: ${category}`}
      description="Practice this reading question type with focused drills."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/reading", label: "Reading" },
        { label: category },
      ]}
      panels={[
        {
          title: "Question type",
          body: `${category} practice with targeted explanations, examples, and timed drills.`,
        },
      ]}
      links={[
        { href: "/reading/analytics", label: "Reading analytics" },
        { href: "/reading", label: "Back to reading home" },
      ]}
    />
  );
}
