import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { articleListQuery, workflowListQuery } from "@/lib/queries";
import { useMe } from "@/lib/me";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Manage content — Hostify Library" }, { name: "description", content: "Edit articles, workflows and team access." }] }),
  component: Admin,
});

function Admin() {
  const { data: me } = useMe();
  const { data: articles = [] } = useQuery(articleListQuery);
  const { data: workflows = [] } = useQuery(workflowListQuery);
  const [f, setF] = useState("");
  if (!me?.canEdit) return <p className="text-muted-foreground">You don't have editor access.</p>;
  const match = (t: string) => t.toLowerCase().includes(f.toLowerCase());
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold">Manage content</h1>
      <Tabs defaultValue="articles" className="mt-6">
        <TabsList>
          <TabsTrigger value="articles">Articles ({articles.length})</TabsTrigger>
          <TabsTrigger value="workflows">Workflows ({workflows.length})</TabsTrigger>
          {me.isAdmin && <TabsTrigger value="people">People</TabsTrigger>}
        </TabsList>
        <div className="mt-4 flex gap-3">
          <Input placeholder="Filter by title…" value={f} onChange={(e) => setF(e.target.value)} className="max-w-sm" />
        </div>
        <TabsContent value="articles" className="mt-4">
          <Button asChild size="sm"><Link to="/admin/articles/$slug" params={{ slug: "new" }}><Plus className="h-4 w-4" /> New article</Link></Button>
          <ul className="mt-4 divide-y rounded-xl border bg-card">
            {articles.filter((a) => match(a.title)).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0"><p className="truncate font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.source} · {a.category}</p></div>
                <Link to="/admin/articles/$slug" params={{ slug: a.slug }} className="text-sm font-medium text-primary">Edit</Link>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="workflows" className="mt-4">
          <Button asChild size="sm"><Link to="/admin/workflows/$slug" params={{ slug: "new" }}><Plus className="h-4 w-4" /> New workflow</Link></Button>
          <ul className="mt-4 divide-y rounded-xl border bg-card">
            {workflows.filter((w) => match(w.title)).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0"><p className="truncate font-medium">{w.title}</p><p className="text-xs text-muted-foreground">{w.category}</p></div>
                <Link to="/admin/workflows/$slug" params={{ slug: w.slug }} className="text-sm font-medium text-primary">Edit</Link>
              </li>
            ))}
          </ul>
        </TabsContent>
        {me.isAdmin && <TabsContent value="people" className="mt-4"><People filter={f} selfId={me.user.id} /></TabsContent>}
      </Tabs>
    </div>
  );
}

function People({ filter, selfId }: { filter: string; selfId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, team, start_date").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (p ?? []).map((x) => ({ ...x, roles: (r ?? []).filter((y) => y.user_id === x.id).map((y) => y.role) }));
    },
  });
  const setRole = async (userId: string, role: "editor" | "admin", on: boolean) => {
    const { error } = on
      ? await supabase.from("user_roles").insert({ user_id: userId, role })
      : await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["people"] });
  };
  const rows = (data ?? []).filter((p) => `${p.full_name} ${p.email}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left"><tr><th className="p-3">Person</th><th className="p-3">Team</th><th className="p-3">Start date</th><th className="p-3">Editor</th><th className="p-3">Admin</th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-3"><p className="font-medium">{p.full_name || "—"}</p><p className="text-xs text-muted-foreground">{p.email}</p></td>
              <td className="p-3">{p.team || "—"}</td>
              <td className="p-3">{p.start_date || "—"}</td>
              <td className="p-3"><Switch checked={p.roles.includes("editor")} onCheckedChange={(v) => setRole(p.id, "editor", v)} /></td>
              <td className="p-3"><Switch disabled={p.id === selfId} checked={p.roles.includes("admin")} onCheckedChange={(v) => setRole(p.id, "admin", v)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
