import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createThread, threadsQuery } from "@/lib/threads";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "Assistant — Hostify Library" }, { name: "description", content: "Ask questions about Hostify and get answers from the library." }] }),
  component: AssistantLayout,
});

function AssistantLayout() {
  const { data: threads = [] } = useQuery(threadsQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const newThread = async () => {
    try {
      const id = await createThread();
      await qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/assistant/$threadId", params: { threadId: id } });
    } catch (e) { toast.error((e as Error).message); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("chat_threads").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["threads"] });
    navigate({ to: "/assistant" });
  };
  return (
    <div className="-my-8 flex h-[calc(100vh-65px)] gap-6 md:-mx-8">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card p-3 lg:flex">
        <Button onClick={newThread} className="w-full"><Plus className="h-4 w-4" /> New conversation</Button>
        <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {threads.map((t) => (
            <div key={t.id} className="group flex items-center rounded-lg hover:bg-muted">
              <Link to="/assistant/$threadId" params={{ threadId: t.id }} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm" activeProps={{ className: "font-semibold text-primary" }}>
                <MessageSquare className="h-4 w-4 shrink-0" /><span className="truncate">{t.title}</span>
              </Link>
              <button onClick={() => remove(t.id)} className="mr-1 hidden rounded p-1 text-muted-foreground hover:text-destructive group-hover:block" aria-label="Delete conversation"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col py-6 pr-4 md:pr-8"><Outlet /></div>
    </div>
  );
}
