import { PlaceholderPage } from "@/lib/page-builders";

export default async function ReadingSetReviewPage(
  props: PageProps<"/reading/sets/[setId]/review">,
) {
  const { setId } = await props.params;

  return (
    <PlaceholderPage
      title={`Reading Review: ${setId}`}
      description="Review answers, explanations, and vocabulary from this set."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/reading", label: "Reading" },
        { href: `/reading/sets/${setId}`, label: setId },
        { label: "Review" },
      ]}
      panels={[
        {
          title: "Explanation view",
          body: "Use this route for correct-answer rationale, distractor notes, and notebook saves.",
        },
      ]}
      links={[{ href: "/notebook", label: "Open notebook" }]}
    />
  );
}
