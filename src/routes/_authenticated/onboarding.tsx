import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { onboardingQuery } from "@/lib/queries";
import { useMe } from "@/lib/me";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "New joiner path — Hostify Library" }, { name: "description", content: "Your first weeks at Hostify, step by step." }] }),
  component: Onboarding,
});

function Onboarding() {
  const { data } = useQuery(onboardingQuery);
  const { data: me } = useMe();
  const qc = useQueryClient();
  if (!data || !me) return null;
  const { steps, done } = data;
  const team = me.profile?.team;
  const pct = steps.length ? Math.round((done.size / steps.length) * 100) : 0;
  const stages = [...new Set(steps.map((s) => s.stage))];

  const toggle = async (id: string) => {
    const { error } = done.has(id)
      ? await supabase.from("onboarding_progress").delete().eq("step_id", id).eq("user_id", me.user.id)
      : await supabase.from("onboarding_progress").insert({ step_id: id, user_id: me.user.id });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["onboarding"] });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-3xl bg-hero p-8 text-primary-foreground shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">New joiner path</p>
        <h1 className="mt-2 text-3xl font-bold">Your first three weeks</h1>
        <p className="mt-2 text-primary-foreground/80">
          {me.profile?.start_date ? `Started ${new Date(me.profile.start_date).toLocaleDateString()}. ` : ""}Work through each step and tick it off.
          {team ? ` Steps for ${team} are highlighted.` : ""}
        </p>
        <div className="mt-6 flex items-center gap-4">
          <Progress value={pct} className="flex-1 bg-primary-foreground/20" />
          <span className="text-sm font-semibold">{pct}%</span>
        </div>
      </div>
      {stages.map((stage) => (
        <section key={stage} className="mt-10">
          <h2 className="text-lg font-bold">{stage}</h2>
          <div className="mt-3 space-y-3">
            {steps.filter((s) => s.stage === stage).map((s) => {
              const isDone = done.has(s.id);
              const mine = team && s.team === team;
              return (
                <div key={s.id} className={`flex gap-4 rounded-xl border bg-card p-5 ${mine ? "border-primary" : ""}`}>
                  <button onClick={() => toggle(s.id)} aria-label={isDone ? "Mark not done" : "Mark done"}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 ${isDone ? "border-success bg-success text-success-foreground" : "border-input"}`}>
                    {isDone && <Check className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`font-semibold ${isDone ? "text-muted-foreground line-through" : ""}`}>{s.title}</h3>
                      {s.team !== "Everyone" && <Badge variant={mine ? "default" : "secondary"}>{s.team}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      {s.article_slug && <Link to="/articles/$slug" params={{ slug: s.article_slug }} className="font-medium text-primary">Read →</Link>}
                      {s.workflow_slug && <Link to="/workflows/$slug" params={{ slug: s.workflow_slug }} className="inline-flex items-center gap-1 font-medium text-primary"><ListChecks className="h-4 w-4" /> Workflow</Link>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
