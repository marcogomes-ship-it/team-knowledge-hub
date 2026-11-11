import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ListChecks, Pencil } from "lucide-react";
import { articleQuery, workflowListQuery } from "@/lib/queries";
import { Markdown } from "@/components/kb/Markdown";
import { SourceIcon } from "./library";
import { useMe } from "@/lib/me";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/articles/$slug")({
  head: () => ({ meta: [{ title: "Article — Hostify Library" }, { name: "description", content: "A Hostify knowledge base article." }] }),
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: a, isLoading } = useQuery(articleQuery(slug));
  const { data: workflows = [] } = useQuery(workflowListQuery);
  const { data: me } = useMe();
  if (isLoading) return <div className="mx-auto max-w-3xl text-muted-foreground">Loading…</div>;
  if (!a) return <div className="mx-auto max-w-3xl">Article not found. <Link to="/library" search={{ category: undefined }} className="text-primary">Back to library</Link></div>;
  const related = workflows.filter((w) => w.article_slug === a.slug);
  return (
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_260px]">
      <article className="min-w-0">
        <Link to="/library" search={{ category: a.category }} className="text-sm text-muted-foreground hover:text-foreground">← {a.category}</Link>
        <h1 className="mt-3 text-3xl font-bold md:text-4xl">{a.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><SourceIcon source={a.source} /> {a.source}</span>
          {a.audience.filter((x) => x !== "Everyone").map((x) => <Badge key={x} variant="secondary">{x}</Badge>)}
          {a.source_url && <a href={a.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">Original <ExternalLink className="h-3.5 w-3.5" /></a>}
          {me?.canEdit && <Link to="/admin/articles/$slug" params={{ slug: a.slug }} className="inline-flex items-center gap-1 text-primary"><Pencil className="h-3.5 w-3.5" /> Edit</Link>}
        </div>
        {a.summary && <p className="mt-6 rounded-xl border-l-4 border-primary bg-secondary p-4 text-secondary-foreground">{a.summary}</p>}
        <div className="mt-6"><Markdown>{a.content}</Markdown></div>
      </article>
      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        {related.length > 0 && (
          <div className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4 text-primary" /> Workflows from this guide</p>
            <ul className="mt-3 space-y-2">
              {related.map((w) => <li key={w.id}><Link to="/workflows/$slug" params={{ slug: w.slug }} className="text-sm hover:text-primary">{w.title}</Link></li>)}
            </ul>
          </div>
        )}
        <Link to="/assistant" className="block rounded-2xl border bg-card p-4 text-sm hover:border-primary">Still unsure? <span className="font-semibold text-primary">Ask the assistant →</span></Link>
      </aside>
    </div>
  );
}
