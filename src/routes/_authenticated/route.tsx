import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, GraduationCap, ListChecks, LogOut, MessagesSquare, Search, Settings, User, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/hostify-logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

const nav = [
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/workflows", label: "Workflows", icon: ListChecks },
  { to: "/onboarding", label: "New joiner path", icon: GraduationCap },
  { to: "/assistant", label: "Assistant", icon: MessagesSquare },
] as const;

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-5">
        <div className="w-fit rounded-lg bg-card px-2.5 py-1.5"><img src={logo} alt="Hostify" className="h-6" /></div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">Library</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
            <n.icon className="h-4 w-4" /> {n.label}
          </Link>
        ))}
        {me?.canEdit && (
          <Link to="/admin" onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
            <Settings className="h-4 w-4" /> Manage content
          </Link>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Link to="/profile" onClick={onNavigate} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
          <User className="h-4 w-4" />
          <span className="truncate">{me?.profile?.full_name || me?.user.email}</span>
        </Link>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

function Layout() {
  const { data: me, isLoading } = useMe();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 md:block"><Sidebar /></aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-64 p-0"><Sidebar onNavigate={() => setOpen(false)} /></SheetContent>
          </Sheet>
          {!path.startsWith("/search") && (
            <form className="relative w-full max-w-xl" onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } }); }}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles and workflows…" className="pl-9" aria-label="Search the library" />
            </form>
          )}
        </header>
        <main className="flex-1 px-4 py-8 md:px-8">
          {isLoading ? null : me && !me.isStaff ? (
            <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center shadow-soft">
              <h1 className="text-xl font-semibold">Access pending</h1>
              <p className="mt-2 text-sm text-muted-foreground">Your account needs a confirmed @hostify.com email. Check your inbox for the confirmation link, then sign in again.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
