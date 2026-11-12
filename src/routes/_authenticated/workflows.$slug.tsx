import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { workflowQuery, type Step } from "@/lib/queries";
import { Markdown } from "@/components/kb/Markdown";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/workflows/$slug")({
  head: () => ({ meta: [{ title: "Workflow — Hostify Library" }, { name: "description", content: "A step-by-step Hostify workflow." }] }),
  component: WorkflowPage,
});

function WorkflowPage() {
  const { slug } = Route.useParams();
  const { data: w, isLoading } = useQuery(workflowQuery(slug));
  const key = `wf-progress:${slug}`;
  const [done, setDone] = useState<number[]>([]);
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(key) || "[]")); } catch { setDone([]); }
  }, [key]);
  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  if (isLoading) return <div className="mx-auto max-w-3xl text-muted-foreground">Loading…</div>;
  if (!w) return <div className="mx-auto max-w-3xl">Workflow not found.</div>;
  const steps = w.steps as Step[];
  const pct = steps.length ? Math.round((done.length / steps.length) * 100) : 0;
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/workflows" className="text-sm text-muted-foreground hover:text-foreground">← Workflows</Link>
      <h1 className="mt-3 text-3xl font-bold">{w.title}</h1>
      <p className="mt-2 text-muted-foreground">{w.summary}</p>
      {w.article_slug && <Link to="/articles/$slug" params={{ slug: w.article_slug }} className="mt-2 inline-block text-sm text-primary">Read the full guide →</Link>}
      <div className="mt-6 flex items-center gap-4 rounded-xl border bg-card p-4">
        <Progress value={pct} className="flex-1" />
        <span className="text-sm font-medium">{done.length}/{steps.length}</span>
        <Button variant="ghost" size="sm" onClick={() => { setDone([]); localStorage.removeItem(key); }}><RotateCcw className="h-4 w-4" /> Reset</Button>
      </div>
      <ol className="mt-6 space-y-3">
        {steps.map((s, i) => {
          const isDone = done.includes(i);
          return (
            <li key={i} className={`rounded-xl border bg-card p-5 transition ${isDone ? "border-success/50" : ""}`}>
              <div className="flex gap-4">
                <button onClick={() => toggle(i)} aria-label={isDone ? "Mark not done" : "Mark done"}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${isDone ? "border-success bg-success text-success-foreground" : "border-primary text-primary"}`}>
                  {isDone ? <Check className="h-4 w-4" /> : i + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold ${isDone ? "text-muted-foreground line-through" : ""}`}>{s.title}</h3>
                  <div className="mt-1 text-sm"><Markdown>{s.detail}</Markdown></div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
