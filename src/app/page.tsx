import { Masthead } from "./components/Masthead";
import { AppShell } from "./components/AppShell";
import { loadDocs, loadLatest, loadSources } from "./lib/data";

export const dynamic = "force-static";

export default async function Home() {
  const [docs, sources, latest] = await Promise.all([
    loadDocs(),
    loadSources(),
    loadLatest(),
  ]);

  return (
    <>
      <Masthead sources={sources} latest={latest} />
      <AppShell docs={docs} sources={sources} latest={latest} />
    </>
  );
}
