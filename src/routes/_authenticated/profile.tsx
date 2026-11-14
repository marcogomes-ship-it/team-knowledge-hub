import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { TEAMS } from "@/lib/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Your profile — Hostify Library" }, { name: "description", content: "Your name, team and start date." }] }),
  component: Profile,
});

function Profile() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [start, setStart] = useState("");
  useEffect(() => {
    if (me?.profile) { setName(me.profile.full_name ?? ""); setTeam(me.profile.team ?? ""); setStart(me.profile.start_date ?? ""); }
  }, [me?.profile]);
  if (!me) return null;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").upsert({ id: me.user.id, full_name: name, team: team || null, start_date: start || null, updated_at: new Date().toISOString() });
    if (error) return void toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["me"] });
  };
  return (
    <form onSubmit={save} className="mx-auto max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-soft">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <p className="text-sm text-muted-foreground">{me.user.email} · {me.roles.join(", ")}</p>
      <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Team</Label>
        <Select value={team} onValueChange={setTeam}><SelectTrigger><SelectValue placeholder="Choose your team" /></SelectTrigger>
          <SelectContent>{TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="space-y-1.5"><Label>Start date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
      <Button>Save</Button>
    </form>
  );
}
