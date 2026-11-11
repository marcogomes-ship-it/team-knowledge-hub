import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEAMS, isHostifyEmail } from "@/lib/teams";
import logo from "@/assets/hostify-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Hostify Library" },
      { name: "description", content: "Sign in to the Hostify internal library with your work email." },
      { property: "og:title", content: "Sign in — Hostify Library" },
      { property: "og:description", content: "Sign in to the Hostify internal library with your work email." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/library", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/library", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const guard = () => {
    if (!isHostifyEmail(email)) {
      toast.error("Please use your @hostify.com email address.");
      return false;
    }
    return true;
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guard()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guard()) return;
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: name, team, start_date: startDate } },
    });
    setBusy(false);
    if (error) toast.error(error.message.includes("hostify.com") ? "Only @hostify.com email addresses can sign up." : error.message);
    else setSent(true);
  };

  const forgot = async () => {
    if (!guard()) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message);
    else toast.success("Check your inbox for a reset link.");
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { hd: "hostify.com", prompt: "select_account" },
    });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed. Use your @hostify.com account.");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-hero p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="w-fit rounded-xl bg-card px-3 py-2"><img src={logo} alt="Hostify" className="h-7" /></div>
        <div>
          <h1 className="text-4xl font-bold">Everything you need to know about working at Hostify.</h1>
          <p className="mt-4 text-primary-foreground/75">Guides, workflows, onboarding and an assistant that knows our docs.</p>
        </div>
        <p className="text-sm text-primary-foreground/60">Staff only · @hostify.com</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <img src={logo} alt="Hostify" className="mb-8 h-8 lg:hidden" />
          {sent ? (
            <div className="rounded-2xl border bg-card p-6 shadow-soft">
              <h2 className="text-xl font-semibold">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to {email}. Open it to finish creating your account.</p>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <Button type="button" variant="outline" className="mt-6 w-full" onClick={google}>Continue with Google</Button>
              <div className="my-4 text-center text-xs uppercase tracking-wider text-muted-foreground">or with email</div>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-4">
                  <Field label="Work email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hostify.com" /></Field>
                  <Field label="Password"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                  <Button className="w-full" disabled={busy}>Sign in</Button>
                  <button type="button" onClick={forgot} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">Forgot password?</button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-4">
                  <Field label="Full name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
                  <Field label="Work email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hostify.com" /></Field>
                  <Field label="Team">
                    <Select value={team} onValueChange={setTeam}>
                      <SelectTrigger><SelectValue placeholder="Choose your team" /></SelectTrigger>
                      <SelectContent>{TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Start date"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
                  <Field label="Password"><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                  <Button className="w-full" disabled={busy}>Create account</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
