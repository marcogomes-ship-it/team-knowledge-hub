import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { workflowQuery, type Step } from "@/lib/queries";
import { CATEGORY_ORDER } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/workflows/$slug")({
  head: () => ({ meta: [{ title: "Edit workflow — Hostify Library" }, { name: "description", content: "Edit a step-by-step workflow." }] }),
  component: EditWorkflow,
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

function EditWorkflow() {
  const { slug } = Route.useParams();
  const isNew = slug === "new";
  const { data: w } = useQuery({ ...workflowQuery(slug), enabled: !isNew });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("Getting Started");
  const [steps, setSteps] = useState<Step[]>([{ title: "", detail: "" }]);
  useEffect(() => {
    if (w) { setTitle(w.title); setSummary(w.summary); setCategory(w.category); setSteps(w.steps as Step[]); }
  }, [w]);
  const upd = (i: number, k: keyof Step, v: string) => setSteps(steps.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const move = (i: number, d: number) => { const n = [...steps]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x!); setSteps(n); };

  const save = async () => {
    if (!title.trim()) return void toast.error("Title is required");
    const row = { title, summary, category, steps: steps.filter((s) => s.title.trim()), updated_at: new Date().toISOString() };
    const res = isNew
      ? await supabase.from("workflows").insert({ ...row, slug: slugify(title) }).select("slug").single()
      : await supabase.from("workflows").update(row).eq("slug", slug).select("slug").single();
    if (res.error) return void toast.error(res.error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["workflows"] });
    navigate({ to: "/workflows/$slug", params: { slug: res.data.slug } });
  };
  const remove = async () => {
    if (!confirm("Delete this workflow?")) return;
    const { error } = await supabase.from("workflows").delete().eq("slug", slug);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["workflows"] });
    navigate({ to: "/admin" });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "New workflow" : "Edit workflow"}</h1>
      <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Summary</Label><Input value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Topic</Label><Input list="wcats" value={category} onChange={(e) => setCategory(e.target.value)} />
        <datalist id="wcats">{CATEGORY_ORDER.map((c) => <option key={c} value={c} />)}</datalist></div>
      <Label>Steps</Label>
      {steps.map((s, i) => (
        <div key={i} className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
            <Input value={s.title} onChange={(e) => upd(i, "title", e.target.value)} placeholder="Step title" />
            <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" disabled={i === steps.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label="Remove step"><Trash2 className="h-4 w-4" /></Button>
          </div>
          <Textarea value={s.detail} onChange={(e) => upd(i, "detail", e.target.value)} rows={3} placeholder="Details (Markdown)" />
        </div>
      ))}
      <Button variant="outline" onClick={() => setSteps([...steps, { title: "", detail: "" }])}><Plus className="h-4 w-4" /> Add step</Button>
      <div className="flex gap-3 pt-2">
        <Button onClick={save}>Save</Button>
        {!isNew && <Button variant="destructive" onClick={remove}>Delete</Button>}
      </div>
    </div>
  );
}
