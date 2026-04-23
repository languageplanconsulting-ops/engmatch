import { PlaceholderPage } from "@/lib/page-builders";

export default async function ListeningSetPage(props: PageProps<"/listening/sets/[setId]">) {
  const { setId } = await props.params;

  return (
    <PlaceholderPage
      title={`Listening Set ${setId}`}
      description="Set details for listening practice."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/listening", label: "Listening" },
        { label: setId },
      ]}
      panels={[
        {
          title: "Set detail",
          body: `Practice questions, transcript support, and answer submission for ${setId}.`,
        },
      ]}
      links={[
        { href: `/listening/sets/${setId}/results`, label: "View results page" },
        { href: "/listening", label: "Back to listening home" },
      ]}
    />
  );
}
