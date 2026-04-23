import { PlaceholderPage } from "@/lib/page-builders";

export default async function SpeakingSessionPage(
  props: PageProps<"/speaking/session/[topicId]">,
) {
  const { topicId } = await props.params;

  return (
    <PlaceholderPage
      title={`Speaking Session ${topicId}`}
      description="Session details and speaking practice tools for this topic."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/speaking", label: "Speaking" },
        { label: topicId },
      ]}
      panels={[
        {
          title: "Topic session",
          body: "Use this session to practise your speaking answer with timer and feedback support.",
        },
      ]}
      links={[
        { href: "/speaking", label: "Back to speaking home" },
        { href: "/speaking/part-1", label: "Go to Part 1 practice" },
      ]}
    />
  );
}
