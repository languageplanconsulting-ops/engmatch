import { PlaceholderPage } from "@/lib/page-builders";

export default async function SpeakingPartPage(props: PageProps<"/speaking/p/[part]">) {
  const { part } = await props.params;

  return (
    <PlaceholderPage
      title={`Speaking Part ${part}`}
      description="Practice question sets for this speaking part."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/speaking", label: "Speaking" },
        { label: `Part ${part}` },
      ]}
      panels={[
        {
          title: "Question flow",
          body: `Start a guided question set for Part ${part} and practise with timing support.`,
        },
      ]}
      links={[
        { href: `/speaking/r/1/p/${part}`, label: "Open question set" },
        { href: "/speaking", label: "Back to speaking home" },
      ]}
    />
  );
}
