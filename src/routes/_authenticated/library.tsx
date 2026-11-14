import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, Globe, LifeBuoy } from "lucide-react";
import { articleListQuery, onboardingQuery, workflowListQuery } from "@/lib/queries";
import { sortCategories } from "@/lib/categories";
import { useMe } from "@/lib/me";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type Search = { category?: string | undefined };

export const Route = createFileRoute("/_authenticated/library")({
  validateSearch: (s: Record<string, unknown>): Search => ({ category: typeof s["category"] === "string" ? (s["category"] as string) : undefined }),
  head: () => ({ meta: [{ title: "Library — Hostify" }, { name: "description", content: "Browse every Hostify guide by topic." }] }),
  component: Library,
});

export function SourceIcon({ source }: { source: string }) {
  if (source === "Help Centre") return <LifeBuoy className="h-3.5 w-3.5" />;
  if (source === "hostify.com") return <Globe className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

function Library() {
  const { category } = Route.useSearch();
  const { data: me } = useMe();
  const { data: articles = [] } = useQuery(articleListQuery);
  const { data: workflows = [] } = useQuery(workflowListQuery);
  const { data: ob } = useQuery(onboardingQuery);
  const cats = sortCategories([...new Set(articles.map((a) => a.category))]);
  const counts = Object.fromEntries(cats.map((c) => [c, articles.filter((a) => a.category === c).length]));
  const internal = articles.filter((a) => a.source === "Google Drive");
  const shown = category ? articles.filter((a) => a.category === category) : [];
  const pct = ob && ob.steps.length ? Math.round((ob.done.size / ob.steps.length) * 100) : 0;
  const first = (me?.profile?.full_name || "").split(" ")[0];

  if (category) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link to="/library" search={{ category: undefined }} className="text-sm text-muted-foreground hover:text-foreground">← All topics</Link>
        <h1 className="mt-3 text-3xl font-bold">{category}</h1>
        <p className="mt-1 text-muted-foreground">{shown.length} articles</p>
        <div className="mt-6 grid gap-3">
          {shown.map((a) => <ArticleRow key={a.id} a={a} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <section className="overflow-hidden rounded-3xl bg-hero p-8 text-primary-foreground shadow-glow md:p-10">
        <h1 className="text-3xl font-bold md:text-4xl">{first ? `Hi ${first}, what do you need today?` : "What do you need today?"}</h1>
        <p className="mt-3 max-w-2xl text-primary-foreground/80">
          {articles.length} articles and {workflows.length} workflows from our help centre, training docs and website.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/assistant" className="inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-semibold text-foreground">Ask the assistant <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/workflows" className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/30 px-4 py-2 text-sm font-semibold">Browse workflows</Link>
        </div>
      </section>

      {ob && ob.steps.length > 0 && (
        <Link to="/onboarding" className="block rounded-2xl border bg-card p-6 shadow-soft transition hover:border-primary">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">New joiner path</p>
              <h2 className="mt-1 text-lg font-semibold">{pct === 100 ? "You've completed the path 🎉" : `${ob.done.size} of ${ob.steps.length} steps done`}</h2>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
          <Progress value={pct} className="mt-4" />
        </Link>
      )}

      <section>
        <h2 className="text-xl font-bold">Internal guides</h2>
        <p className="text-sm text-muted-foreground">Training manuals, playbooks and processes from the team.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {internal.map((a) => <ArticleRow key={a.id} a={a} />)}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Browse by topic</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <Link key={c} to="/library" search={{ category: c }} className="flex items-center justify-between rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-soft">
              <span className="font-medium">{c}</span>
              <Badge variant="secondary">{counts[c]}</Badge>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ArticleRow({ a }: { a: { slug: string; title: string; summary: string; source: string; category: string } }) {
  return (
    <Link to="/articles/$slug" params={{ slug: a.slug }} className="group rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-soft">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><SourceIcon source={a.source} /> {a.source} · {a.category}</div>
      <h3 className="mt-1.5 font-semibold group-hover:text-primary">{a.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.summary}</p>
    </Link>
  );
}
