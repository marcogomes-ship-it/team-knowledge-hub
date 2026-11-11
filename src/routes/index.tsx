import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, ListChecks, GraduationCap, MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/hostify-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hostify Library — internal knowledge for every team" },
      { name: "description", content: "Articles, workflows, onboarding and an AI assistant for Hostify staff." },
      { property: "og:title", content: "Hostify Library" },
      { property: "og:description", content: "Articles, workflows, onboarding and an AI assistant for Hostify staff." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: BookOpen, title: "Every guide in one place", body: "Help centre articles, training manuals, demo guides and channel playbooks." },
  { icon: ListChecks, title: "Step-by-step workflows", body: "Onboardings, escalations, invoicing and integrations as checklists." },
  { icon: GraduationCap, title: "New joiner path", body: "A three-week route through everything you need to know, with progress tracking." },
  { icon: MessagesSquare, title: "Ask the assistant", body: "Get answers drawn from our own documentation, with links to the source." },
];

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/library", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-hero text-primary-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3 rounded-xl bg-card px-3 py-2">
          <img src={logo} alt="Hostify" className="h-7" />
        </div>
        <Button asChild variant="secondary"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">Internal · Staff only</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] md:text-6xl">The Hostify Library</h1>
        <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">
          One place for how we sell, onboard, support and run Hostify. Built for every team, and for your first weeks with us.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary"><Link to="/auth">Sign in with your @hostify.com email</Link></Button>
        </div>
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-6 backdrop-blur">
              <f.icon className="h-6 w-6" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-primary-foreground/75">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
