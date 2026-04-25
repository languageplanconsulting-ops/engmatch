import { getDbListeningSets } from "@/lib/db-content";
import { demoSets } from "@/lib/demo-data";
import { PlaceholderPage } from "@/lib/page-builders";

export default async function ListeningSetPage(props: PageProps<"/listening/sets/[setId]">) {
  const { setId } = await props.params;
  const remote = (await getDbListeningSets()).find((set) => set.id === setId);
  const builtIn = demoSets.listening.find((set) => set.id === setId);
  const item = remote ?? builtIn;
  const description = remote?.description ?? "Set details for listening practice.";
  const detailBody = remote?.transcript ?? `Practice questions, transcript support, and answer submission for ${setId}.`;

  return (
    <PlaceholderPage
      title={item?.title ?? `Listening Set ${setId}`}
      description={description}
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/listening", label: "Listening" },
        { label: setId },
      ]}
      panels={[
        {
          title: "Set detail",
          body: detailBody,
        },
      ]}
      links={[
        { href: `/listening/sets/${setId}/results`, label: "View results page" },
        { href: "/listening", label: "Back to listening home" },
      ]}
    />
  );
}
