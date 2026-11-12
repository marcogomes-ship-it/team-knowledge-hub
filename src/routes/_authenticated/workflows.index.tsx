import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ListChecks } from "lucide-react";
import { workflowListQuery, type Step } from "@/lib/queries";
import { sortCategories } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/workflows/")({
  head: () => ({ meta: [{ title: "Workflows — Hostify Library" }, { name: "description", content: "Step-by-step Hostify procedures." }] }),
  component: Workflows,
});

function Workflows() {
  const { data = [] } = useQuery(workflowListQuery);
  const [cat, setCat] = useState<string | null>(null);
  const cats = sortCategories([...new Set(data.map((w) => w.category))]);
  const shown = cat ? data.filter((w) => w.category === cat) : data;
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold">Workflows</h1>
      <p className="mt-1 text-muted-foreground">Step-by-step procedures you can follow and tick off as you go.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setCat(null)} className={`rounded-full border px-3 py-1 text-sm ${!cat ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>All</button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-sm ${cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{c}</button>
        ))}
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((w) => (
          <Link key={w.id} to="/workflows/$slug" params={{ slug: w.slug }} className="group flex flex-col rounded-xl border bg-card p-5 transition hover:border-primary hover:shadow-soft">
            <div className="flex items-center justify-between">
              <ListChecks className="h-5 w-5 text-primary" />
              <Badge variant="secondary">{(w.steps as Step[]).length} steps</Badge>
            </div>
            <h3 className="mt-3 font-semibold group-hover:text-primary">{w.title}</h3>
            <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{w.summary}</p>
            <p className="mt-auto pt-3 text-xs text-muted-foreground">{w.category}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
