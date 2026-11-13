import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createThread } from "@/lib/threads";
import mark from "@/assets/hostify-mark.png";

export const Route = createFileRoute("/_authenticated/assistant/")({
  component: AssistantHome,
});

export const SUGGESTIONS = [
  "How do I connect a new Airbnb account?",
  "What's the onboarding process for a client with 30 properties?",
  "How do we position Hostify against Guesty?",
  "How do I escalate an Agoda connectivity issue?",
  "How do fee templates work?",
  "What happens in my first week?",
];

function AssistantHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const start = async (q?: string) => {
    try {
      const id = await createThread();
      await qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/assistant/$threadId", params: { threadId: id }, search: { q } });
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="m-auto max-w-2xl text-center">
      <img src={mark} alt="" className="mx-auto h-14 w-14" />
      <h1 className="mt-4 text-3xl font-bold">Ask the Hostify assistant</h1>
      <p className="mt-2 text-muted-foreground">Answers come from our help centre, training guides and website, with links to the source.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => start(s)} className="rounded-xl border bg-card p-4 text-left text-sm transition hover:border-primary hover:shadow-soft">{s}</button>
        ))}
      </div>
      <button onClick={() => start()} className="mt-6 text-sm font-semibold text-primary">Start a blank conversation →</button>
    </div>
  );
}
