import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ListChecks, Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { SourceIcon } from "./library";

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: (s: Record<string, unknown>): { q: string } => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : "" }),
  head: () => ({ meta: [{ title: "Search — Hostify Library" }, { name: "description", content: "Search Hostify articles and workflows." }] }),
  component: SearchPage,
});

function Snippet({ text }: { text: string }) {
  const parts = text.replace(/[#*\[\]\\]/g, "").split(/(<<.*?>>)/g);
  return <>{parts.map((p, i) => p.startsWith("<<") ? <mark key={i} className="rounded bg-accent px-0.5 text-accent-foreground">{p.slice(2, -2)}</mark> : <span key={i}>{p}</span>)}</>;
}

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [value, setValue] = useState(q);
  useEffect(() => setValue(q), [q]);
  const { data = [], isFetching } = useQuery({
    queryKey: ["search", q],
    enabled: q.length > 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_library", { q, max_results: 40 });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="mx-auto max-w-3xl">
      <form onSubmit={(e) => { e.preventDefault(); navigate({ to: "/search", search: { q: value.trim() } }); }} className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search everything…" className="h-12 pl-12 text-base" />
      </form>
      <p className="mt-4 text-sm text-muted-foreground">{q ? (isFetching ? "Searching…" : `${data.length} results for “${q}”`) : "Type to search articles and workflows."}</p>
      <div className="mt-4 space-y-3">
        {data.map((r) => (
          <Link key={r.kind + r.slug} to={r.kind === "workflow" ? "/workflows/$slug" : "/articles/$slug"} params={{ slug: r.slug }} className="block rounded-xl border bg-card p-4 hover:border-primary hover:shadow-soft">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {r.kind === "workflow" ? <><ListChecks className="h-3.5 w-3.5 text-primary" /> Workflow</> : <SourceIcon source="" />} · {r.category}
            </div>
            <h3 className="mt-1 font-semibold">{r.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground"><Snippet text={r.snippet || r.summary} /></p>
          </Link>
        ))}
      </div>
    </div>
  );
}
