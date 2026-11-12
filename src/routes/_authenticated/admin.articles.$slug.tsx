import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { articleQuery } from "@/lib/queries";
import { CATEGORY_ORDER } from "@/lib/categories";
import { Markdown } from "@/components/kb/Markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/articles/$slug")({
  head: () => ({ meta: [{ title: "Edit article — Hostify Library" }, { name: "description", content: "Edit a library article." }] }),
  component: EditArticle,
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

function EditArticle() {
  const { slug } = Route.useParams();
  const isNew = slug === "new";
  const { data: a } = useQuery({ ...articleQuery(slug), enabled: !isNew });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", category: "Getting Started", summary: "", content: "", audience: "Everyone", source_url: "" });
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (a) setForm({ title: a.title, category: a.category, summary: a.summary, content: a.content, audience: a.audience.join(", "), source_url: a.source_url ?? "" });
  }, [a]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    const row = { title: form.title, category: form.category, summary: form.summary, content: form.content,
      audience: form.audience.split(",").map((x) => x.trim()).filter(Boolean), source_url: form.source_url || null, updated_at: new Date().toISOString() };
    const res = isNew
      ? await supabase.from("articles").insert({ ...row, slug: slugify(form.title), source: "Internal" }).select("slug").single()
      : await supabase.from("articles").update(row).eq("slug", slug).select("slug").single();
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["articles"] });
    navigate({ to: "/articles/$slug", params: { slug: res.data.slug } });
  };
  const remove = async () => {
    if (!confirm("Delete this article?")) return;
    const { error } = await supabase.from("articles").delete().eq("slug", slug);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["articles"] });
    navigate({ to: "/admin" });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "New article" : "Edit article"}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2"><Label>Title</Label><Input value={form.title} onChange={set("title")} /></div>
        <div className="space-y-1.5"><Label>Topic</Label>
          <Input list="cats" value={form.category} onChange={set("category")} />
          <datalist id="cats">{CATEGORY_ORDER.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="space-y-1.5"><Label>Audience (comma separated)</Label><Input value={form.audience} onChange={set("audience")} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Summary</Label><Input value={form.summary} onChange={set("summary")} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Original link (optional)</Label><Input value={form.source_url} onChange={set("source_url")} /></div>
      </div>
      <div className="flex items-center justify-between"><Label>Content (Markdown)</Label>
        <Button variant="ghost" size="sm" onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</Button></div>
      {preview ? <div className="rounded-xl border bg-card p-6"><Markdown>{form.content}</Markdown></div>
        : <Textarea value={form.content} onChange={set("content")} rows={24} className="font-mono text-sm" />}
      <div className="flex gap-3">
        <Button onClick={save}>Save</Button>
        {!isNew && <Button variant="destructive" onClick={remove}>Delete</Button>}
      </div>
    </div>
  );
}
